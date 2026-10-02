const API_BASE_URL = "http://127.0.0.1:8000/api";

export async function apiRequest(
  endpoint,
  {
    method = "GET",
    body = null,
    token = null,
  } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.detail || "Si è verificato un errore."
    );

    error.data = data;
    error.status = response.status;

    throw error;
  }

  return data;
}
