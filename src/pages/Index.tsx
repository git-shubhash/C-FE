import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to login page
    navigate('/login');
  }, [navigate]);

  return null;
};

export default Index;
