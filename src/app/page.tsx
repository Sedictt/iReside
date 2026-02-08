"use client";

import { createClient } from "@/utils/supabase/client";
import styles from "./page.module.css";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Search,
  FileCheck,
  ClipboardList,
  Handshake,
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Menu,
  X,
  LayoutGrid,
  Map,
  BarChart3,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Home as HomeIcon,
  Key,
  Zap,
  Clock,
  CreditCard,
  Grid,
  Users,
  UserCircle2
} from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"tenant" | "landlord" | "admin" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserRole(profile?.role ?? "tenant");
      } else {
        setUserRole(null);
      }
    }
    getUser();
  }, []);

  const tenantCtaHref = user ? "/tenant/search" : "/login";
  const landlordCtaHref = user ? "/account" : "/login";
  const dashboardHref = user
    ? userRole === "landlord"
      ? "/landlord/dashboard"
      : userRole === "admin"
        ? "/admin"
        : "/tenant/dashboard"
    : null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Building2 size={22} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>iReside</span>
              <span className={styles.logoSubtitle}>Property Management</span>
            </div>
          </div>

          <nav className={styles.nav}>
            <a href="#browse" className={styles.navLink}>Browse Units</a>
            <a href="#landlord" className={styles.navLink}>For Landlords</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#contact" className={styles.navLink}>Contact</a>
          </nav>

          <div className={styles.headerActions}>
            {!user ? (
              <>
                <Link href="/login" className={styles.signInBtn}>Sign In</Link>
                <Link href="/login?view=sign_up" className={styles.getStartedBtn}>
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <Link href={dashboardHref ?? "/account"} className={styles.getStartedBtn}>
                  Dashboard
                </Link>
                <div className={styles.profileMenuWrap}>
                  <Link href="/account" className={styles.profileIconBtn} aria-label="Open profile">
                    <UserCircle2 size={22} />
                  </Link>
                  <div className={styles.profileMenu} role="menu" aria-label="Profile menu">
                    <Link href="/account" className={styles.profileMenuItem} role="menuitem">
                      Profile
                    </Link>
                    <Link href="/account/settings" className={styles.profileMenuItem} role="menuitem">
                      Settings
                    </Link>
                    <div className={styles.profileMenuDivider} />
                    <button
                      type="button"
                      className={styles.profileMenuItem}
                      onClick={handleSignOut}
                      role="menuitem"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <a href="#browse" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Browse Units</a>
            <a href="#landlord" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>For Landlords</a>
            <a href="#features" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#contact" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Contact</a>
            {!user ? (
              <>
                <Link href="/login" className={styles.mobileNavLink}>Sign In</Link>
                <Link href="/login?view=sign_up" className={styles.getStartedBtn}>
                  Get Started
                </Link>
              </>
            ) : (
              <Link href={dashboardHref ?? "/account"} className={styles.getStartedBtn}>
                Dashboard
              </Link>
            )}
          </div>
        )}
      </header>

      {/* 1. Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <img
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop"
            alt="Futuristic Building"
            className={styles.heroBgImage}
          />
          <div className={styles.heroOverlay}></div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <Sparkles size={14} />
              <span>The Future of Living</span>
            </div>
            <h1 className={styles.heroTitle}>
              Find your perfect space.<br />
              <span>Manage with ease.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              The all-in-one platform connecting tenants with their dream homes and empowering landlords with powerful management tools.
            </p>
            <div className={styles.heroCtas}>
              <Link href={tenantCtaHref} className={`${styles.heroCta} ${styles.primary}`}>
                <Search size={18} />
                Find a Place
              </Link>
              <Link href={landlordCtaHref} className={`${styles.heroCta} ${styles.secondary}`}>
                <Building2 size={18} />
                Manage Property
              </Link>
            </div>
            <div className={styles.heroTrust}>
              <div className={styles.trustAvatars}>
                {[1, 2, 3].map(i => (
                  <div key={i} className={styles.trustAvatar}>
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className={styles.trustText}>
                <div className={styles.trustStars}>
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                </div>
                <p>Trusted by 10,000+ users</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Audience Split Section */}
      <section className={styles.audienceSection}>
        <div className={styles.audienceContainer}>
          <div className={`${styles.audienceCard} ${styles.tenantCard}`}>
            <div className={styles.cardBgImage}>
              <img src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1000&auto=format&fit=crop" alt="Tenant Living" />
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}>
                <HomeIcon size={32} />
              </div>
              <h3>For Tenants</h3>
              <ul>
                <li><Search size={16} /> Search by location & price</li>
                <li><FileCheck size={16} /> View amenities & rules</li>
                <li><CreditCard size={16} /> Transparent pricing</li>
              </ul>
              <Link href={tenantCtaHref} className={styles.cardLink}>
                Find a Home <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className={`${styles.audienceCard} ${styles.landlordCard}`}>
            <div className={styles.cardBgImage}>
              <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop" alt="Property Management" />
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardIcon}>
                <Building2 size={32} />
              </div>
              <h3>For Landlords</h3>
              <ul>
                <li><LayoutGrid size={16} /> Centralized management</li>
                <li><BarChart3 size={16} /> Automated financial tracking</li>
                <li><Users size={16} /> Tenant analytics</li>
              </ul>
              <Link href={landlordCtaHref} className={styles.cardLink}>
                Start Managing <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Property Discovery Section (Tenant Focused) */}
      <section id="browse" className={styles.browseSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Discover Your Next Home</h2>
          <p className={styles.sectionSubtitle}>Browse verified dorms, apartments, and boarding houses.</p>
        </div>

        {/* Mock Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <div className={styles.searchInput}>
              <MapPin size={18} className={styles.searchIcon} />
              <input type="text" placeholder="Enter city, barangay, or area..." />
            </div>
            <div className={styles.separator}></div>
            <div className={styles.searchInput}>
              <DollarSignIcon />
              <select>
                <option>Price Range</option>
                <option>₱2k - ₱5k</option>
                <option>₱5k - ₱10k</option>
                <option>₱10k+</option>
              </select>
            </div>
            <Link href="/tenant/search" className={styles.searchBtn}>Search</Link>
          </div>
        </div>

        <div className={styles.listingsGrid}>
          <ListingCard
            image="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80"
            title="Modern Studio in Valenzuela"
            location="Karuhatan, Valenzuela City"
            price="₱8,500"
            type="Apartment"
            tags={["WiFi", "AC"]}
          />
          <ListingCard
            image="https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=500&q=80"
            title="Cozy Dorm near OLFU"
            location="Marulas, Valenzuela City"
            price="₱3,500"
            type="Dorm"
            tags={["Females Only", "Study Hall"]}
          />
          <ListingCard
            image="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&q=80"
            title="Spacious 2BR Unit"
            location="Malanday, Valenzuela City"
            price="₱12,000"
            type="Apartment"
            tags={["Parking", "Pet Friendly"]}
          />
        </div>
        <div className={styles.centerCta}>
          <Link href="/tenant/search" className={styles.secondaryBtn}>Browse Available Units</Link>
        </div>
      </section>

      {/* 4. Landlord Command Center */}
      <section id="landlord" className={styles.commandCenterSection}>
        <div className={styles.commandCenterContent}>
          <div className={styles.cmdInternal}>
            <div className={styles.cmdText}>
              <div className={styles.cmdBadge}>
                <ShieldCheck size={14} />
                <span>Pro Management Suite</span>
              </div>
              <h2 className={styles.cmdTitle}>
                The Landlord <br />
                <span className={styles.cmdTitleHighlight}>Command Center</span>
              </h2>
              <p className={styles.cmdDesc}>
                Total control at your fingertips. From automated billing to maintenance triage,
                manage your entire portfolio from a single, powerful dashboard.
              </p>

              <div className={styles.cmdStatsRow}>
                <div className={styles.cmdStatItem}>
                  <span className={styles.cmdStatVal}>98%</span>
                  <span className={styles.cmdStatLabel}>On-time Payments</span>
                </div>
                <div className={styles.cmdDivider}></div>
                <div className={styles.cmdStatItem}>
                  <span className={styles.cmdStatVal}>24/7</span>
                  <span className={styles.cmdStatLabel}>System Uptime</span>
                </div>
                <div className={styles.cmdDivider}></div>
                <div className={styles.cmdStatItem}>
                  <span className={styles.cmdStatVal}>0</span>
                  <span className={styles.cmdStatLabel}>Paperwork</span>
                </div>
              </div>

              <Link href={landlordCtaHref} className={styles.cmdBtn}>
                Launch Dashboard <ChevronRight size={18} />
              </Link>
            </div>

            <div className={styles.cmdVisual}>
              <div className={styles.dashboardMockup}>
                {/* Mockup Header */}
                <div className={styles.dashHeader}>
                  <div className={styles.dashDots}>
                    <span></span><span></span><span></span>
                  </div>
                  <div className={styles.dashSearch}></div>
                  <div className={styles.dashProfile}></div>
                </div>

                {/* Mockup Content Grid */}
                <div className={styles.dashGrid}>
                  <div className={styles.dashSidebar}>
                    <div className={styles.dashLine}></div>
                    <div className={styles.dashLine}></div>
                    <div className={styles.dashLine} style={{ width: '60%' }}></div>
                  </div>
                  <div className={styles.dashMain}>
                    <div className={styles.dashHeroCard}>
                      <div className={styles.dashGraph}>
                        <div className={styles.graphBar} style={{ height: '40%' }}></div>
                        <div className={styles.graphBar} style={{ height: '70%' }}></div>
                        <div className={styles.graphBar} style={{ height: '50%' }}></div>
                        <div className={styles.graphBar} style={{ height: '85%' }}></div>
                        <div className={styles.graphBar} style={{ height: '60%' }}></div>
                      </div>
                    </div>
                    <div className={styles.dashRow}>
                      <div className={styles.dashCardSmall}></div>
                      <div className={styles.dashCardSmall}></div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className={`${styles.floatCard} ${styles.floatRent}`}>
                  <div className={styles.floatIcon}><CheckCircle2 size={16} /></div>
                  <div className={styles.floatText}>
                    <span>Rent Received</span>
                    <strong>₱15,000.00</strong>
                  </div>
                </div>

                <div className={`${styles.floatCard} ${styles.floatTenant}`}>
                  <div className={styles.floatAvatar}></div>
                  <div className={styles.floatText}>
                    <span>New Tenant</span>
                    <strong>Sarah J.</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI Insights Section */}
      {/* 6. AI Insights Section */}
      <section className={styles.aiSection}>
        <div className={styles.aiContainerSimple}>
          <div className={styles.sectionHeader}>
            <div className={styles.aiBadgeSimple}>
              <Sparkles size={14} />
              <span>Smart Assist</span>
            </div>
            <h2 className={styles.sectionTitle}>AI-Powered Intelligence</h2>
            <p className={styles.sectionSubtitle}>
              Data-driven insights to help you manage smarter, not harder.
            </p>
          </div>

          <div className={styles.aiGridSimple}>
            <div className={styles.aiCardSimple}>
              <div className={`${styles.aiIconSimple} ${styles.iconPurple}`}>
                <BarChart3 size={24} />
              </div>
              <h3>Predictive Trends</h3>
              <p>Forecast occupancy rates and identify churn risks before they happen.</p>
            </div>

            <div className={styles.aiCardSimple}>
              <div className={`${styles.aiIconSimple} ${styles.iconBlue}`}>
                <ShieldCheck size={24} />
              </div>
              <h3>Risk Assessment</h3>
              <p>Evaluate tenant reliability based on payment history and behavior patterns.</p>
            </div>

            <div className={styles.aiCardSimple}>
              <div className={`${styles.aiIconSimple} ${styles.iconOrange}`}>
                <Zap size={24} />
              </div>
              <h3>Smart Triage</h3>
              <p>Prioritize maintenance requests automatically based on urgency severity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Key Features Overview */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.featureBadge}>
            <Zap size={14} />
            <span>Powerful Capabilities</span>
          </div>
          <h2 className={styles.sectionTitle}>Everything You Need</h2>
          <p className={styles.sectionSubtitle}>
            Comprehensive tools designed to streamline every aspect of property management.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureItem icon={<CreditCard />} title="Automated Invoicing" desc="Generate and send recurring invoices automatically." />
          <FeatureItem icon={<ClipboardList />} title="Maintenance Tracking" desc="Track issues from report to resolution." />
          <FeatureItem icon={<Users />} title="Tenant Directory" desc="Keep all lease and contact details in one secure place." />
          <FeatureItem icon={<BarChart3 />} title="Financial Analytics" desc="Visual reports on revenue, expenses, and growth." />
          <FeatureItem icon={<Clock />} title="Real-time Alerts" desc="Get notified instantly about payments or emergencies." />
          <FeatureItem icon={<Smartphone />} title="Mobile First" desc="Manage everything from your phone, anywhere." />
        </div>
      </section>

      {/* 8. Trust & Legitimacy */}
      <section className={styles.trustSection}>
        <div className={styles.trustContainer}>
          <div className={styles.trustContent}>
            <div className={styles.trustHeader}>
              <div className={styles.trustIconMain}>
                <ShieldCheck size={28} strokeWidth={2.5} />
              </div>
              <div className={styles.trustTexts}>
                <h2>Trusted & Compliant</h2>
                <div className={styles.trustMeta}>
                  <span className={styles.trustLocation}>
                    <MapPin size={14} /> Valenzuela City
                  </span>
                  <span className={styles.trustDot}>•</span>
                  <span>Legal Dorms & Apartments</span>
                </div>
              </div>
            </div>

            <div className={styles.trustBadges}>
              <div className={styles.trustBadgeItem}>
                <CheckCircle2 size={18} className={styles.badgeIcon} />
                <span>Verified Listings</span>
              </div>
              <div className={styles.trustBadgeItem}>
                <ShieldCheck size={18} className={styles.badgeIcon} />
                <span>Data Privacy</span>
              </div>
              <div className={styles.trustBadgeItem}>
                <Phone size={18} className={styles.badgeIcon} />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. How It Works */}
      <section className={styles.stepsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
        </div>

        <div className={styles.stepsContainer}>
          <div className={styles.stepsColumn}>
            <h3>For Tenants</h3>
            <div className={styles.stepList}>
              <Step number={1} title="Search" desc="Filter by location, price, and type." />
              <Step number={2} title="View Details" desc="Check amenities, photos, and rules." />
              <Step number={3} title="Move In" desc="Connect with landlords and sign leases." />
            </div>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.stepsColumn}>
            <h3>For Landlords</h3>
            <div className={styles.stepList}>
              <Step number={1} title="Sign Up" desc="Create a free account in seconds." />
              <Step number={2} title="Apply" desc="Submit landlord verification documents." />
              <Step number={3} title="Manage" desc="Once approved, manage properties with ease." />
            </div>
          </div>
        </div>
      </section>

      {/* 10. Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaBackground}>
              <div className={styles.ctaCircle1}></div>
              <div className={styles.ctaCircle2}></div>
            </div>

            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>
                Ready to upgrade your <br />
                <span className={styles.ctaTitleHighlight}>living experience?</span>
              </h2>
              <p className={styles.ctaSubtitle}>
                Join thousands of tenants and landlords creating better rental relationships today.
              </p>

              <div className={styles.ctaActions}>
                <Link href={tenantCtaHref} className={styles.ctaBtnPrimary}>
                  Find Your Next Home
                  <ArrowRight size={18} />
                </Link>
                <Link href={landlordCtaHref} className={styles.ctaBtnSecondary}>
                  List & Manage Property
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandCol}>
              <div className={styles.footerLogo}>
                <Building2 size={24} className={styles.brandIcon} />
                <span className={styles.brandName}>iReside</span>
              </div>
              <p className={styles.brandDesc}>
                Simplifying property management with intelligent tools for landlords and seamless experiences for tenants.
              </p>
              <div className={styles.socialLinks}>
                <a href="#" className={styles.socialIcon}><FacebookIcon /></a>
                <a href="#" className={styles.socialIcon}><TwitterIcon /></a>
                <a href="#" className={styles.socialIcon}><InstagramIcon /></a>
                <a href="#" className={styles.socialIcon}><LinkedinIcon /></a>
              </div>
            </div>

            <div className={styles.footerLinksGrid}>
              <div className={styles.footerGroup}>
                <h4>Platform</h4>
                <a href="#browse">Browse Units</a>
                <a href="#landlord">Landlord Suite</a>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className={styles.footerGroup}>
                <h4>Company</h4>
                <a href="/about">About Us</a>
                <a href="/careers">Careers</a>
                <a href="/blog">Blog</a>
                <a href="/contact">Contact</a>
              </div>
              <div className={styles.footerGroup}>
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/cookies">Cookie Policy</a>
              </div>
            </div>
          </div>

          <div className={styles.footerNewsletter}>
            <div className={styles.newsletterContent}>
              <h4>Stay up to date</h4>
              <p>Subscribe to our newsletter for the latest property trends.</p>
            </div>
            <div className={styles.newsletterForm}>
              <input type="email" placeholder="Enter your email" />
              <button>Subscribe</button>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} iReside. All rights reserved.</p>
            <div className={styles.footerBottomLinks}>
              <a href="#">Privacy</a>
              <span className={styles.dot}>•</span>
              <a href="#">Terms</a>
              <span className={styles.dot}>•</span>
              <a href="#">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Sub-components for cleaner code
function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className={styles.featureItem}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: number, title: string, desc: string }) {
  return (
    <div className={styles.stepRow}>
      <div className={styles.stepNumber}>{number}</div>
      <div>
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function ListingCard({ image, title, location, price, type, tags }: any) {
  return (
    <div className={styles.listingCard}>
      <div className={styles.listingImage}>
        <img src={image} alt={title} />
        <span className={styles.listingType}>{type}</span>
      </div>
      <div className={styles.listingInfo}>
        <div className={styles.listingHeader}>
          <h3>{title}</h3>
          <span className={styles.listingPrice}>{price}<span>/mo</span></span>
        </div>
        <p className={styles.listingLoc}><MapPin size={14} /> {location}</p>
        <div className={styles.listingTags}>
          {tags.map((t: string, i: number) => <span key={i}>{t}</span>)}
        </div>
      </div>
    </div>
  )
}

function DollarSignIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  )
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
  )
}

function TwitterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
  )
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
  )
}

function LinkedinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
  )
}
