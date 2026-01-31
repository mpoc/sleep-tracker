export const getApiKey = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const apiKey = searchParams.get("apiKey");
  return apiKey || undefined;
};
