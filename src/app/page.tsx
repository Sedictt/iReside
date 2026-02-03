"use client";

import { createClient } from "@/utils/supabase/client";
import styles from "./page.module.css";
import Link from "next/link";
import { ArrowRight, Building2, Wallet, FileText, Key, CheckCircle2 } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  const tenantCtaHref = user ? "/tenant/dashboard" : "/login?role=tenant";
  const landlordCtaHref = user ? "/landlord/dashboard" : "/login?role=landlord";

  return (
    <main className={styles.main}>
      {/* Navbar moved inside page for simplicity or can be kept in layout if prefered, 
          but here we just use the header styles defined in module.css */}
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><Building2 size={24} color="white" /></div>
            <span>TenantPlatform</span>
          </div>
          <div className={styles.navActions}>
            {!user && (
              <>
                <Link href="/login" className={styles.navLink}>Sign In</Link>
                <Link href="/login?view=sign_up" className={`${styles.btn} ${styles.btnPrimarySmall}`}>Get Started</Link>
              </>
            )}
            {user && (
              <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimarySmall}`}>Dashboard</Link>
            )}
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className="container">
          <Hero tenantHref={tenantCtaHref} landlordHref={landlordCtaHref} />
        </div>
      </section>

      {/* 2. VALUE PROPOSITION (Darker strip) */}
      <section className={styles.valuesSection}>
        <div className="container">
          <div className={styles.gridThree}>
            <div className={styles.valueCard}>
              <div className={styles.iconBox}><Wallet size={24} /></div>
              <h3>Automated Payments</h3>
              <p>Rent is collected, tracked, and deposited automatically. No more awkward texts.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.iconBox}><FileText size={24} /></div>
              <h3>Digital Leasing</h3>
              <p>Create, sign, and store legally binding leases instantly from any device.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.iconBox}><Key size={24} /></div>
              <h3>Smart Access</h3>
              <p>Manage maintenance requests and property access in one simple dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DUAL PATHWAY SECTION */}
      <section className={styles.pathwaySection}>
        <div className="container">
          <div className={styles.pathwayGrid}>

            {/* Tenants Side */}
            <div className={styles.pathwayCard}>
              <span className={styles.roleLabel}>For Tenants</span>
              <h2>Rent without the stress.</h2>
              <p>Build credit, pay rent in seconds, and get repairs done faster.</p>

              <ul className={styles.checkList}>
                <li><CheckCircle2 size={18} /> Zero paperwork move-ins</li>
                <li><CheckCircle2 size={18} /> 24/7 maintenance reporting</li>
                <li><CheckCircle2 size={18} /> Secure digital payments</li>
              </ul>

              <Link href={tenantCtaHref} className={`${styles.btn} ${styles.btnOutline}`}>
                I&apos;m a Tenant <ArrowRight size={16} />
              </Link>
            </div>

            {/* Landlords Side */}
            <div className={styles.pathwayCard}>
              <span className={styles.roleLabel} style={{ color: 'var(--primary)' }}>For Landlords</span>
              <h2>Manage on autopilot.</h2>
              <p>From screening to accounting, scale your portfolio without the chaos.</p>

              <ul className={styles.checkList}>
                <li><CheckCircle2 size={18} /> Guaranteed rent payouts</li>
                <li><CheckCircle2 size={18} /> Instant tenant screening</li>
                <li><CheckCircle2 size={18} /> Automated expense tracking</li>
              </ul>

              <Link href={landlordCtaHref} className={`${styles.btn} ${styles.btnPrimary}`}>
                I&apos;m a Landlord <ArrowRight size={16} />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className={styles.footer}>
        <div className="container">
          <p>&copy; 2026 Tenant Platform Inc. All rights reserved.</p>
        </div>
      </footer>

    </main>
  );
}
