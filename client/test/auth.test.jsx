import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "@/components/auth/login-form";
import AppShell from "@/components/layout/app-shell";
import { apiRequest, ApiError } from "@/lib/api";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation, useSearchParams: () => new URLSearchParams(), usePathname: () => "/dashboard" }));
vi.mock("@/components/layout/sidebar", () => ({ default: () => <nav aria-label="Main navigation">Navigation</nav> }));
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn(), ApiError: class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } } }));

function renderWithQuery(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("authentication frontend", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("validates login fields before making a request", async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginForm/>);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(await screen.findByText("Enter your password.")).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("shows invalid credentials and submits a valid login", async () => {
    const user = userEvent.setup();
    apiRequest.mockRejectedValueOnce(new ApiError("Invalid email or password.", 401)).mockResolvedValueOnce({ data: { admin: { email: "admin@example.test" } } });
    renderWithQuery(<LoginForm/>);
    await user.type(screen.getByLabelText("Email address"), "admin@example.test");
    await user.type(screen.getByLabelText("Password"), "local-test-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/dashboard"));
    expect(apiRequest).toHaveBeenNthCalledWith(1, "/auth/login", expect.objectContaining({ method: "POST" }));
  });

  it("blocks protected content and redirects when the session is unauthorized", async () => {
    apiRequest.mockRejectedValue(new ApiError("Please sign in to continue.", 401));
    renderWithQuery(<AppShell><p>Protected dashboard</p></AppShell>);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login?next=%2Fdashboard"));
    expect(screen.queryByText("Protected dashboard")).not.toBeInTheDocument();
  });

  it("shows protected content for an authenticated admin", async () => {
    apiRequest.mockResolvedValue({ data: { admin: { email: "admin@example.test" } } });
    renderWithQuery(<AppShell><p>Protected dashboard</p></AppShell>);
    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
    expect(screen.getByText("admin@example.test")).toBeInTheDocument();
  });

  it("shows a retryable API error instead of an endless session spinner", async () => {
    const user = userEvent.setup();
    apiRequest.mockRejectedValueOnce(new ApiError("Could not reach the API. Check your connection and try again."))
      .mockResolvedValueOnce({ data: { admin: { email: "admin@example.test" } } });
    renderWithQuery(<AppShell><p>Protected dashboard</p></AppShell>);
    expect(await screen.findByRole("heading", { name: "Unable to verify your session" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the API");
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Protected dashboard")).toBeInTheDocument();
  });

  it("does not treat an API error as an unauthenticated session", async () => {
    apiRequest.mockRejectedValue(new ApiError("The API is temporarily unavailable.", 503));
    renderWithQuery(<AppShell><p>Protected dashboard</p></AppShell>);
    expect(await screen.findByRole("alert")).toHaveTextContent("The API is temporarily unavailable.");
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
