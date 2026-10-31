const EMAIL_REGEX = /^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/;

const isValidEmail = (email) => typeof email === 'string' && EMAIL_REGEX.test(email.trim());

const isStrongEnoughPassword = (password) =>
  typeof password === 'string' && password.length >= 6;

const ALLOWED_ROLES = ['student', 'faculty', 'admin'];

const validateRegisterInput = ({ name, email, password, role, semester }) => {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!password || !isStrongEnoughPassword(password)) {
    errors.push('Password must be at least 6 characters long');
  }

  if (role && !ALLOWED_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  if (semester !== undefined && semester !== null && semester !== '') {
    const sem = Number(semester);
    if (Number.isNaN(sem) || sem < 1 || sem > 12) {
      errors.push('Semester must be a number between 1 and 12');
    }
  }

  return errors;
};

const validateLoginInput = ({ email, password }) => {
  const errors = [];
  if (!email || !isValidEmail(email)) errors.push('Please provide a valid email address');
  if (!password) errors.push('Password is required');
  return errors;
};

module.exports = {
  isValidEmail,
  isStrongEnoughPassword,
  ALLOWED_ROLES,
  validateRegisterInput,
  validateLoginInput,
};
