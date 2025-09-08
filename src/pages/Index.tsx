import { Navigate } from "react-router-dom";

const Index = () => {
  return <Navigate to="/communities/boca-bridges?welcome=true" replace />;
};

export default Index;