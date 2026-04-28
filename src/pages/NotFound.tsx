import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="intercept-bg flex min-h-screen items-center justify-center">
      <div className="relative z-10 glass p-12 text-center">
        <h1 className="mb-4 text-[48px] font-bold tracking-[-0.5px] text-white">404</h1>
        <p className="mb-6 text-xl text-[#9ca3af]">Oops! Page not found</p>
        <a href="/" className="text-[#b9e045] underline-offset-4 hover:underline font-medium">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
