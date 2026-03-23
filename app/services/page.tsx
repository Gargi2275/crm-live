import { FadeInUp } from "@/components/FadeInUp";
import { ServiceCard } from "@/components/ServiceCard";
import { CTABanner } from "@/components/CTABanner";
import { UserCheck, Shield, CheckCircle, Globe, FileX } from "lucide-react";

export const metadata = {
  title: "OCI, Indian e-Visa & Passport Services | FlyOCI",
  description: "FlyOCI offers end-to-end support for OCI cards, Indian e-Visas and Indian passport renewals for UK & US residents. Choose the service that fits your situation.",
};

export default function ServicesPage() {
  const services = [
    { 
      title: "New OCI Card", 
      description: "End-to-end support for first-time applicants from the UK and US.", 
      icon: <UserCheck />, 
      href: "/services/new-oci",
      price: "£88 service fee"
    },
    { 
      title: "OCI Renewal / Transfer", 
      description: "Transfer your existing OCI details to your new passport.", 
      icon: <Shield />, 
      href: "/services/oci-renewal",
      price: "£78 service fee"
    },
    { 
      title: "OCI Update (Gratis)", 
      description: "Mandatory updates required by government rules.", 
      icon: <CheckCircle />, 
      href: "/services/oci-update",
      price: "£50 service fee"
    },
    { 
      title: "Indian e-Visa", 
      description: "1-Year & 5-Year tourist and business e-Visas.", 
      icon: <Globe />, 
      href: "/services/indian-evisa",
      price: "From £88"
    },
    { 
      title: "Indian Passport Renewal", 
      description: "Renewing Indian passports for NRIs living abroad.", 
      icon: <FileX />, 
      href: "/services/passport-renewal",
      price: "Price on request"
    },
  ];

  return (
    <>
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-saffron/5 rounded-l-full blur-3xl -z-10" />
        <div className="max-w-4xl mx-auto text-center">
          <FadeInUp>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-navy mb-6">
              Our Services
            </h1>
            <p className="text-lg md:text-xl text-textMuted font-body mb-10 max-w-3xl mx-auto leading-relaxed">
              FlyOCI offers end-to-end support for OCI cards, Indian e-Visas and Indian passport renewals for UK & US residents. Choose the service that fits your situation, or start with a Document Audit if you're unsure.
            </p>
          </FadeInUp>
        </div>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <FadeInUp key={service.title} delay={index * 0.1}>
                <ServiceCard {...service} />
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
}
