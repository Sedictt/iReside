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
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  const tenantCtaHref = user ? "/tenant/dashboard" : "/login?role=tenant";
  const landlordCtaHref = user ? "/landlord/dashboard" : "/login?role=landlord";

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
              <span className={styles.logoTitle}>TenantPro</span>
              <span className={styles.logoSubtitle}>Property Management</span>
            </div>
          </div>

          <nav className={styles.nav}>
            <a href="#about" className={styles.navLink}>About</a>
            <a href="#catalog" className={styles.navLink}>Properties</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
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
              <Link href="/landlord/dashboard" className={styles.getStartedBtn}>
                Dashboard
              </Link>
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
            <a href="#about" className={styles.mobileNavLink}>About</a>
            <a href="#catalog" className={styles.mobileNavLink}>Properties</a>
            <a href="#how-it-works" className={styles.mobileNavLink}>How It Works</a>
            <a href="#contact" className={styles.mobileNavLink}>Contact</a>
            {!user ? (
              <>
                <Link href="/login" className={styles.mobileNavLink}>Sign In</Link>
                <Link href="/login?view=sign_up" className={styles.getStartedBtn}>
                  Get Started
                </Link>
              </>
            ) : (
              <Link href="/landlord/dashboard" className={styles.getStartedBtn}>
                Dashboard
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Property<br />
              <span>Management</span><br />
              Made Simple
            </h1>
            <p className={styles.heroSubtitle}>
              Rent, manage, and grow your property portfolio—
              from single units to entire buildings.
            </p>
            <Link href={landlordCtaHref} className={styles.heroCta}>
              Start Your Journey
            </Link>
          </div>
          <div className={styles.heroImage}>
            <div className={styles.heroImageBg}></div>
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80"
              alt="Modern Building"
            />
          </div>
        </div>
      </section>

      {/* About / Stats Section */}
      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutContent}>
          <div className={styles.aboutText}>
            <h2 className={styles.sectionTitle}>About Us</h2>
            <p className={styles.aboutDescription}>
              We are a property management platform that helps landlords
              find the perfect tenants and manage their properties efficiently.
              Our comprehensive suite of tools handles everything from
              tenant screening to rent collection.
            </p>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>10+</span>
              <span className={styles.statLabel}>Years Experience</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>1000+</span>
              <span className={styles.statLabel}>Happy Clients</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>4000+</span>
              <span className={styles.statLabel}>Properties Managed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>95%</span>
              <span className={styles.statLabel}>Client Satisfaction</span>
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className={styles.partnersSection}>
        <div className={styles.partnersInner}>
          <span className={styles.partnerLogo}>🏢 PropertyHub</span>
          <span className={styles.partnerLogo}>🏗️ BuildCorp</span>
          <span className={styles.partnerLogo}>🏠 HomeFirst</span>
          <span className={styles.partnerLogo}>🏬 RealtyPro</span>
          <span className={styles.partnerLogo}>🏘️ EstateMax</span>
        </div>
      </section>

      {/* Property Catalog */}
      <section id="catalog" className={styles.catalogSection}>
        <div className={styles.catalogHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Property Catalog</h2>
            <p className={styles.sectionSubtitle}>
              Wide selection of properties for your business needs
            </p>
          </div>
        </div>
        <div className={styles.catalogGrid}>
          <div className={styles.catalogCard}>
            <div className={styles.catalogImage}>
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80"
                alt="Office Space"
              />
            </div>
            <div className={styles.catalogInfo}>
              <h3>Office Spaces</h3>
              <p>4000+ available</p>
            </div>
          </div>
          <div className={styles.catalogCard}>
            <div className={styles.catalogImage}>
              <img
                src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&q=80"
                alt="Warehouse"
              />
            </div>
            <div className={styles.catalogInfo}>
              <h3>Warehouses</h3>
              <p>1000+ available</p>
            </div>
          </div>
          <div className={styles.catalogCard}>
            <div className={styles.catalogImage}>
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80"
                alt="Residential"
              />
            </div>
            <div className={styles.catalogInfo}>
              <h3>Residential Units</h3>
              <p>2000+ available</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howSection}>
        <div className={styles.howInner}>
          <div className={styles.howImage}>
            <img
              src="https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=600&q=80"
              alt="Consultation"
            />
            <div className={styles.consultBadge}>
              Free Consultation
            </div>
          </div>
          <div className={styles.howContent}>
            <h2 className={styles.sectionTitle}>How We Work</h2>
            <p className={styles.howDescription}>
              We&apos;ve made the property management process simple and transparent.
            </p>
            <div className={styles.howSteps}>
              <div className={styles.howStep}>
                <div className={styles.stepIcon}>
                  <ClipboardList size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Consultation & Analysis</h4>
                  <p>We learn about your needs and determine the best property type for you.</p>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.stepIcon}>
                  <Search size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Property Search</h4>
                  <p>We offer only verified properties matching your budget and goals.</p>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.stepIcon}>
                  <Building2 size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Property Viewing</h4>
                  <p>We organize viewings and provide complete property information.</p>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.stepIcon}>
                  <FileCheck size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Document Preparation</h4>
                  <p>We handle all document verification and ownership registration.</p>
                </div>
              </div>
              <div className={styles.howStep}>
                <div className={styles.stepIcon}>
                  <Handshake size={20} />
                </div>
                <div className={styles.stepContent}>
                  <h4>Deal Completion</h4>
                  <p>We support you through contract signing and beyond.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <h2 className={styles.sectionTitle}>What Clients Say</h2>
        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <div className={styles.stars}>
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
            </div>
            <p>&quot;TenantPro completely transformed how I manage my properties. The platform is intuitive and the support team is amazing!&quot;</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorAvatar}>JM</div>
              <div>
                <strong>Juan Martinez</strong>
                <span>Property Owner</span>
              </div>
            </div>
          </div>
          <div className={styles.testimonialCard}>
            <div className={styles.stars}>
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
            </div>
            <p>&quot;Finding a rental has never been easier. The process was smooth and I found my perfect apartment in days!&quot;</p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.authorAvatar}>MS</div>
              <div>
                <strong>Maria Santos</strong>
                <span>Tenant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactInner}>
          <div className={styles.contactForm}>
            <h2>Let&apos;s Discuss Partnership</h2>
            <p>Ready to get started? Fill out the form and we&apos;ll be in touch.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" />
              <input type="email" placeholder="Email Address" />
              <input type="tel" placeholder="Phone Number" />
              <textarea placeholder="Your Message" rows={4}></textarea>
              <button type="submit">
                Send Message <ChevronRight size={18} />
              </button>
            </form>
          </div>
          <div className={styles.contactInfo}>
            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <Phone size={20} />
              </div>
              <div>
                <span>Call Us</span>
                <strong>+63 (2) 8888-0000</strong>
              </div>
            </div>
            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <Mail size={20} />
              </div>
              <div>
                <span>Email Us</span>
                <strong>hello@tenantpro.com</strong>
              </div>
            </div>
            <div className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <MapPin size={20} />
              </div>
              <div>
                <span>Visit Us</span>
                <strong>BGC, Taguig City</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <Building2 size={20} />
              </div>
              <span className={styles.logoTitle}>TenantPro</span>
            </div>
            <p>Your trusted partner in property management.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#catalog">Properties</a>
              <a href="#contact">Contact</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Services</h4>
              <a href="#">Property Rental</a>
              <a href="#">Property Sales</a>
              <a href="#">Management</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2026 TenantPro. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
