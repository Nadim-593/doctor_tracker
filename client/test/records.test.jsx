import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecordForm from "@/components/ui/record-form";
import RecordTable from "@/components/ui/record-table";
import { apiRequest } from "@/lib/api";
import { useRecords } from "@/hooks/use-records";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const tableState = vi.hoisted(() => ({ mode: "ready", calls: [] }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation, useSearchParams: () => new URLSearchParams("doctor=doctor-1"), useParams: () => ({ id: "record-1" }) }));
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("@/hooks/use-records", () => ({
  useRecords: vi.fn((resource, params = {}) => {
    tableState.calls.push({ resource, params });
    if (resource === "doctors" && params.limit === 100) return { data: { items: [{ _id: "doctor-1", name: "Dr Mira Sen", specialization: "Cardiology" }] }, isPending: false, isError: false };
    if (tableState.mode === "loading") return { data: undefined, isPending: true, isError: false, refetch: vi.fn() };
    if (tableState.mode === "error") return { data: undefined, isPending: false, isError: true, error: new Error("API unavailable"), refetch: vi.fn() };
    return { data: { items: [{ _id: "doctor-1", name: "Dr Mira Sen", email: "mira@example.test", specialization: "Cardiology", hospital: "Northstar", phone: "555-0111", patientCount: 2 }], total: 25, pagination: { total: 25, totalPages: 3 } }, isPending: false, isError: false, refetch: vi.fn() };
  }),
  useRecord: vi.fn(),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/components/ui/confirm-dialog", () => ({ default: () => null }));

function renderWithQuery(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("doctor and patient UI", () => {
  beforeEach(() => { vi.clearAllMocks(); tableState.mode = "ready"; tableState.calls = []; });

  it("validates and submits doctor create forms", async () => {
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({ data: { _id: "doctor-1" } });
    renderWithQuery(<RecordForm type="doctor"/>);
    await user.click(screen.getByRole("button", { name: "Create doctor" }));
    expect(await screen.findByText("Enter the doctor's name.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Full name"), "Dr Mira Sen");
    await user.type(screen.getByLabelText("Email address"), "mira@example.test");
    await user.type(screen.getByLabelText("Phone number"), "+1 555 0101");
    await user.type(screen.getByLabelText("Specialization"), "Cardiology");
    await user.type(screen.getByLabelText("Hospital"), "Northstar Clinic");
    await user.click(screen.getByRole("button", { name: "Create doctor" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/doctors", expect.objectContaining({ method: "POST" })));
    expect(navigation.push).toHaveBeenCalledWith("/doctors");
  });

  it("validates patient forms and uses the doctor from the doctor details link", async () => {
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({ data: { _id: "patient-1" } });
    renderWithQuery(<RecordForm type="patient"/>);
    await user.click(screen.getByRole("button", { name: "Create patient" }));
    expect(await screen.findByText("Select a date of birth.")).toBeInTheDocument();
    expect(screen.getByLabelText("Assigned doctor")).toHaveValue("doctor-1");
    await user.type(screen.getByLabelText("Full name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Phone number"), "+1 555 0202");
    await user.type(screen.getByLabelText("Date of birth"), "1990-05-18");
    await user.selectOptions(screen.getByLabelText("Gender"), "undisclosed");
    await user.type(screen.getByLabelText("Primary condition"), "Routine follow-up");
    await user.click(screen.getByRole("button", { name: "Create patient" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/patients", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(apiRequest.mock.calls[0][1].body).doctor).toBe("doctor-1");
  });

  it("debounces search and sends server-side filters, sorting, and pagination", async () => {
    const user = userEvent.setup();
    renderWithQuery(<RecordTable resource="doctors"/>);
    expect(screen.getByText(/Showing 1–10 of 25/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(tableState.calls.some(call => call.resource === "doctors" && call.params.page === 2)).toBe(true));
    await user.type(screen.getByRole("textbox", { name: /Search name/ }), "Mira");
    await waitFor(() => expect(tableState.calls.some(call => call.params.q === "Mira" && call.params.page === 1)).toBe(true), { timeout: 1200 });
    await user.type(screen.getByLabelText("Filter by hospital"), "Northstar");
    await waitFor(() => expect(tableState.calls.some(call => call.params.hospital === "Northstar")).toBe(true));
    await user.type(screen.getByLabelText("Filter by specialization"), "Cardiology");
    await waitFor(() => expect(tableState.calls.some(call => call.params.specialization === "Cardiology")).toBe(true));
    await user.type(screen.getByLabelText("Created from"), "2026-10-01");
    await waitFor(() => expect(tableState.calls.some(call => call.params.createdFrom === "2026-10-01T00:00:00.000Z")).toBe(true));
  });

  it("supports patient doctor and condition filters", async () => {
    const user = userEvent.setup();
    renderWithQuery(<RecordTable resource="patients"/>);
    await user.selectOptions(screen.getByLabelText("Filter by doctor"), "doctor-1");
    await user.type(screen.getByLabelText("Filter by condition"), "Asthma");
    await waitFor(() => expect(tableState.calls.some(call => call.resource === "patients" && call.params.doctor === "doctor-1" && call.params.condition === "Asthma")).toBe(true));
  });

  it("renders table loading and retryable error states", async () => {
    tableState.mode = "loading";
    const { rerender } = renderWithQuery(<RecordTable resource="doctors"/>);
    expect(screen.getByLabelText("Loading records")).toBeInTheDocument();
    tableState.mode = "error";
    rerender(<QueryClientProvider client={new QueryClient()}><RecordTable resource="doctors"/></QueryClientProvider>);
    expect(await screen.findByText("We couldn’t load this data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
