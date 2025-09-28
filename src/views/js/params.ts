export const getApiKey = () => {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has("apiKey")) {
    const textElement = document.getElementById("text");
    if (textElement) {
      textElement.innerHTML = "No API key provided";
    }
    return;
  }
  const apiKey = searchParams.get("apiKey");
  return apiKey ?? undefined;
};

export const getAutoLog = () => {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has("autoLog")) {
    return null;
  }
  const autoLog = searchParams.get("autoLog");
  return autoLog;
};
