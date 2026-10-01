// Length only, so passphrases and password-manager secrets pass (WP-E4). Keep in step with PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH in api.php.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Counts code points, as PHP's mb_strlen does, so an emoji is one character on both sides.
export const isAcceptablePassword = (password: string) => {
  const length = Array.from(password).length;
  return length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH;
};
