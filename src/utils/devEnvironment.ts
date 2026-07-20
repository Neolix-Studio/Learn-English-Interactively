export const isLocalDevHost = () => {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};
