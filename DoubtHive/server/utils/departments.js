// Department and Semester normalization and validation utilities

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other',
];

const DEPARTMENT_ALIASES = {
  cse: 'Computer Science',
  cs: 'Computer Science',
  'computer science': 'Computer Science',
  'computer science & engineering': 'Computer Science',
  'computer science and engineering': 'Computer Science',
  it: 'Information Technology',
  'information technology': 'Information Technology',
  'info tech': 'Information Technology',
  ece: 'Electronics & Communication',
  'electronics & communication': 'Electronics & Communication',
  'electronics and communication': 'Electronics & Communication',
  'electronics and communication engineering': 'Electronics & Communication',
  eee: 'Electrical Engineering',
  'electrical engineering': 'Electrical Engineering',
  'electrical & electronics': 'Electrical Engineering',
  'electrical and electronics engineering': 'Electrical Engineering',
  me: 'Mechanical Engineering',
  mech: 'Mechanical Engineering',
  'mechanical engineering': 'Mechanical Engineering',
  ce: 'Civil Engineering',
  civil: 'Civil Engineering',
  'civil engineering': 'Civil Engineering',
};

/**
 * Normalizes user-input department string to standard title.
 * e.g., 'cse' -> 'Computer Science', 'mech' -> 'Mechanical Engineering'
 */
const normalizeDepartment = (dept) => {
  if (!dept || typeof dept !== 'string') return '';
  const trimmed = dept.trim();
  const lower = trimmed.toLowerCase();
  return DEPARTMENT_ALIASES[lower] || trimmed;
};

/**
 * Checks whether two department strings refer to the same department
 */
const isSameDepartment = (deptA, deptB) => {
  const normA = normalizeDepartment(deptA).toLowerCase();
  const normB = normalizeDepartment(deptB).toLowerCase();
  return Boolean(normA && normB && normA === normB);
};

/**
 * Creates a case-insensitive regex for department queries
 */
const departmentRegex = (dept) => {
  const normalized = normalizeDepartment(dept);
  const safe = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${safe}$`, 'i');
};

module.exports = {
  DEPARTMENTS,
  DEPARTMENT_ALIASES,
  normalizeDepartment,
  isSameDepartment,
  departmentRegex,
};
