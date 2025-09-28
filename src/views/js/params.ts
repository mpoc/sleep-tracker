export const getApiKey = () => {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has('apiKey')) {
    document.getElementById('text').innerHTML = 'No API key provided';
    return null;
  }
  const apiKey = searchParams.get('apiKey');
  return apiKey;
}

export const getAutoLog = () => {
  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has('autoLog')) {
    return null;
  }
  const autoLog = searchParams.get('autoLog');
  return autoLog;
}
