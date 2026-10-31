import { ShieldAlert } from 'lucide-react';
import RoleLoginForm from '../components/RoleLoginForm.jsx';

function AdminLogin() {
  return (
    <RoleLoginForm
      role="admin"
      heading="Admin Portal"
      subheading="Secure administration access — authorised personnel only"
      icon={ShieldAlert}
      accentColor="#ff3d9a"
      accentColor2="#ffc83d"
      redirectTo="/admin"
      otherRoles={[
        { label: 'Student', path: '/student-login' },
        { label: 'Faculty', path: '/faculty-login' },
      ]}
    />
  );
}

export default AdminLogin;
