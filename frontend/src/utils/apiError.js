// Normalizes an axios error thrown by the API into a consistent shape:
// { message: string, fieldErrors: { [field]: string } }
export function parseApiError(error) {
  const payload = error?.response?.data;
  if (!payload) {
    return {
      message: error?.message || "Something went wrong. Please try again.",
      fieldErrors: {},
    };
  }

  const fieldErrors = {};
  if (Array.isArray(payload.errors)) {
    for (const item of payload.errors) {
      if (item?.field && !fieldErrors[item.field]) {
        fieldErrors[item.field] = item.message;
      }
    }
  }

  return {
    message: payload.message || "Request failed.",
    fieldErrors,
    errors: payload.errors || [],
  };
}
