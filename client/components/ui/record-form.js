"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useRecords } from "@/hooks/use-records";

const configs = {
  doctor: { resource: "doctors", schemaKey: "doctorSchema", fields: [
    ["name", "Full name", "text", "Dr. Alex Morgan"], ["email", "Email address", "email", "alex@example.com"], ["phone", "Phone number", "tel", "+1 (555) 000-0000"], ["specialization", "Specialization", "text", "Cardiology"], ["hospital", "Hospital", "text", "Community Clinic"]
  ] },
  patient: { resource: "patients", schemaKey: "patientSchema", fields: [
    ["name", "Full name", "text", "Jordan Lee"], ["email", "Email address (optional)", "email", "jordan@example.com"], ["phone", "Phone number", "tel", "+1 (555) 000-0000"], ["dateOfBirth", "Date of birth", "date", ""], ["gender", "Gender", "gender", ""], ["condition", "Primary condition", "text", "Hypertension"], ["doctor", "Assigned doctor", "doctor", ""], ["notes", "Care notes", "textarea", ""]
  ] },
};

function Field({ field, register, error, doctors }) {
  const [name, label, type, placeholder] = field;
  const common = { id: name, className: "field", ...register(name), "aria-invalid": Boolean(error), "aria-describedby": error ? `${name}-error` : undefined };
  return <div className="form-field"><label htmlFor={name}>{label}</label>
    {type === "gender" ? <select {...common}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="undisclosed">Prefer not to say</option></select>
      : type === "doctor" ? <select {...common}><option value="">Select a doctor</option>{(doctors || []).map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name} · {d.specialization}</option>)}</select>
      : type === "textarea" ? <textarea {...common} placeholder="Add relevant context for the care team"/> : <input {...common} type={type} placeholder={placeholder} />}
    {error && <p className="form-error" id={`${name}-error`}>{error.message}</p>}
  </div>;
}

export default function RecordForm({ type, recordId, initialValues = {} }) {
  const config = configs[type];
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useQueryClient();
  const [submitError, setSubmitError] = useState("");
  const doctorQuery = useRecords("doctors", { limit: 100, sort: "name", order: "asc" });
  const schema = requireSchema(config.schemaKey);
  const initialDoctor = initialValues.doctor?._id || initialValues.doctor || "";
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { ...initialValues, dateOfBirth: initialValues.dateOfBirth ? String(initialValues.dateOfBirth).slice(0, 10) : "", doctor: initialDoctor || searchParams.get("doctor") || "" } });
  const mutation = useMutation({ mutationFn: values => apiRequest(`/${config.resource}${recordId ? `/${encodeURIComponent(recordId)}` : ""}`, { method: recordId ? "PATCH" : "POST", body: JSON.stringify(values) }), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: [config.resource] }), client.invalidateQueries({ queryKey: ["dashboard"] }), ...(type === "patient" ? [client.invalidateQueries({ queryKey: ["doctors"] })] : [])]); router.push(`/${config.resource}`); } });
  const onSubmit = values => { setSubmitError(""); mutation.mutate(values, { onError: error => setSubmitError(error.message) }); };
  return <form className="form-card" onSubmit={handleSubmit(onSubmit)} noValidate>
    {submitError && <div className="alert" role="alert">{submitError}</div>}
    <h2 className="form-section-title">{type === "doctor" ? "Professional information" : "Patient information"}</h2>
    <div className="form-grid">{config.fields.map(field => <Field key={field[0]} field={field} register={register} error={errors[field[0]]} doctors={doctorQuery.data?.items || doctorQuery.data || []}/>)}</div>
    {type === "patient" && doctorQuery.isError && <div className="alert" role="status">Doctor list unavailable. Check the API connection to assign a doctor.</div>}
    <div className="form-actions"><Link className="button" href={`/${config.resource}`}>Cancel</Link><button className="button button-primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : recordId ? "Save changes" : `Create ${type}`}</button></div>
  </form>;
}

function requireSchema(key) {
  // Schemas are loaded from the centralized validation module.
  return schemas[key];
}
import * as schemas from "@/lib/schemas";
