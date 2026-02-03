import styles from "./page.module.css";
import { createClient } from "@/utils/supabase/server";
import { Hero } from "@/components/home/Hero";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className={styles.main}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <nav style={{
        position: 'absolute',
        top: '2rem',
        right: '2rem',
        zIndex: 100,
        display: 'flex',
        gap: '1rem'
      }}>
        {user ? (
          <Link href="/landlord/dashboard" className="glass-panel" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="glass-panel" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
            Sign In
          </Link>
        )}
      </nav>

      <Hero />
    </main>
  );
}
