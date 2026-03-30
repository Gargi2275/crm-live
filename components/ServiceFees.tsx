import Link from "next/link";

export function ServiceFees() {
  return (
    <section className="py-14 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-primary mb-3">Our Services & Fees</h2>
          <p className="text-textMuted text-sm sm:text-base md:text-lg max-w-3xl mx-auto">
            We keep our pricing transparent and simple. Government fees (where applicable) are clearly shown.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          <article className="border border-gray-200 bg-white rounded-2xl hover:border-gray-400 p-4 sm:p-5 flex flex-col">
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary leading-snug">OCI Update</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">Gratis service on govt portal</p>
            <div className="border-t border-gray-200 mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary mt-1">£50</p>
            <span className="bg-[#e6f4ee] text-[#0f5c38] text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">£35 with audit credit</span>
            <p className="text-xs text-[#0f5c38] mt-2">Save £15 with audit</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block border border-gray-300 rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base hover:bg-gray-50 text-center font-semibold text-primary transition-colors">
                Select
              </Link>
            </div>
          </article>

          <article className="border-2 border-[#1a7f5a] bg-[#f4fbf7] rounded-2xl p-4 sm:p-5 flex flex-col relative">
            <span className="absolute top-4 right-4 bg-[#1a7f5a] text-white text-[11px] px-2.5 sm:px-3 py-1 rounded-full font-semibold">Popular</span>
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary pr-16 sm:pr-20 leading-snug">New OCI Application</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">Most selected by applicants</p>
            <div className="border-t border-[#cfe9de] mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary mt-1">£88</p>
            <span className="bg-[#e6f4ee] text-[#0f5c38] text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">£73 with audit credit</span>
            <p className="text-xs text-[#0f5c38] mt-2">Save £15 with audit</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block bg-[#1a7f5a] text-white rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base text-center font-semibold hover:bg-[#136648] transition-colors">
                Select
              </Link>
            </div>
          </article>

          <article className="border border-gray-200 bg-white rounded-2xl hover:border-gray-400 p-4 sm:p-5 flex flex-col">
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary leading-snug">OCI Renewal / Transfer</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">Transfer to new passport</p>
            <div className="border-t border-gray-200 mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary mt-1">£78</p>
            <span className="bg-[#e6f4ee] text-[#0f5c38] text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">£63 with audit credit</span>
            <p className="text-xs text-[#0f5c38] mt-2">Save £15 with audit</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block border border-gray-300 rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base hover:bg-gray-50 text-center font-semibold text-primary transition-colors">
                Select
              </Link>
            </div>
          </article>

          <article className="border border-gray-200 bg-white rounded-2xl hover:border-gray-400 p-4 sm:p-5 flex flex-col">
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary leading-snug">Indian e-Visa 1 Year</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">Includes government fee of approx. £32</p>
            <div className="border-t border-gray-200 mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary mt-1">£88</p>
            <span className="bg-gray-100 text-gray-400 text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">No credit</span>
            <p className="text-xs text-gray-400 mt-2">Government fee included</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block border border-gray-300 rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base hover:bg-gray-50 text-center font-semibold text-primary transition-colors">
                Select
              </Link>
            </div>
          </article>

          <article className="border border-gray-200 bg-white rounded-2xl hover:border-gray-400 p-4 sm:p-5 flex flex-col lg:col-start-2">
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary leading-snug">Indian e-Visa 5 Year</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">Includes government fee of approx. £70</p>
            <div className="border-t border-gray-200 mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary mt-1">£150</p>
            <span className="bg-gray-100 text-gray-400 text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">No credit</span>
            <p className="text-xs text-gray-400 mt-2">Government fee included</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block border border-gray-300 rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base hover:bg-gray-50 text-center font-semibold text-primary transition-colors">
                Select
              </Link>
            </div>
          </article>

          <article className="border border-dashed border-gray-300 bg-gray-50 rounded-2xl p-4 sm:p-5 flex flex-col lg:col-start-3">
            <h3 className="text-base sm:text-lg font-heading font-bold text-primary leading-snug">Indian Passport Renewal</h3>
            <p className="text-xs sm:text-sm text-textMuted mt-1 min-h-[34px] sm:min-h-[40px]">UK/US applicants, depends on category and courier options</p>
            <div className="border-t border-gray-300 mt-4 pt-4" />

            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Our Fee</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-gray-500 mt-1">On request</p>
            <span className="bg-gray-100 text-gray-400 text-xs px-3 py-1 rounded-full inline-flex w-fit mt-3">No credit</span>
            <p className="text-xs text-gray-400 mt-2">Share your case for an exact quote</p>

            <div className="mt-auto pt-5">
              <Link href="/contact" className="block border border-dashed border-gray-400 rounded-xl w-full py-2 sm:py-2.5 text-sm sm:text-base text-center font-semibold text-gray-700 hover:bg-white transition-colors">
                Get a quote →
              </Link>
            </div>
          </article>
        </div>

        <p className="text-xs text-textMuted mt-6 text-center">
          All prices are per applicant and exclude courier/postage where applicable.
        </p>

        <div className="text-center mt-8">
          <Link href="/pricing" className="inline-flex items-center rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-50 transition-colors">
            View full pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
