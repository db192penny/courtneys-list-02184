import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import useIsAdmin from "@/hooks/useIsAdmin";

const Header = () => {
  const [authed, setAuthed] = useState(false);
  const { data: isAdmin } = useIsAdmin();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 items-center justify-between">
        <Link to="/" className="font-semibold">Courtney's List</Link>
        <div className="flex items-center gap-2">
          {authed ? (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost">
                <Link to="/household">Your Home</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/communities/boca-bridges">Boca Bridges Overview</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/profile">Profile & Privacy</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost">
                  <Link to="/admin">Admin</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <Button asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
