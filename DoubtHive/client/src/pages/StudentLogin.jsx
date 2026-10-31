import { GraduationCap } from 'lucide-react';
import RoleLoginForm from '../components/RoleLoginForm.jsx';

function StudentLogin() {
  return (
    <RoleLoginForm
      role="student"
      heading="Student Portal"
      subheading="Ask doubts, earn XP, level up your knowledge"
      icon={GraduationCap}
      accentColor="#22e4ff"
      accentColor2="#5b8cff"
      redirectTo="/explore"
      otherRoles={[
        { label: 'Faculty', path: '/faculty-login' },
        { label: 'Admin', path: '/admin-login' },
      ]}
    />
  );
}

export default StudentLogin;
