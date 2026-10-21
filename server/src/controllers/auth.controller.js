import * as auth from "../services/auth.service.js";

export async function login(request, response) {
  response.json({ data: await auth.login(request.validated.body.email, request.validated.body.password, response) });
}

export function logout(_request, response) {
  auth.logout(response);
  response.status(204).end();
}

export function me(request, response) {
  response.json({ data: { admin: request.admin } });
}
