import { BookOpen } from 'lucide-react';
import RoleLoginForm from '../components/RoleLoginForm.jsx';

function FacultyLogin() {
  return (
    <RoleLoginForm
      role="faculty"
      heading="Faculty Portal"
      subheading="Guide students, share expertise, and mentor the hive"
      icon={BookOpen}
      accentColor="#9a6bff"
      accentColor2="#ff3d9a"
      redirectTo="/explore"
      otherRoles={[
        { label: 'Student', path: '/student-login' },
        { label: 'Admin', path: '/admin-login' },
      ]}
    />
  );
}

export default FacultyLogin;
