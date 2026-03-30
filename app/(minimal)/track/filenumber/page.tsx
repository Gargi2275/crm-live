"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, MessageCircle, Mail, CheckCircle2, Circle } from "lucide-react";

export default function TrackFileNumberPage() {
	const searchParams = useSearchParams();
	const ref = searchParams.get("ref") || "FO-EV-2026-000001";

	const stages = [
		{ label: "Registered", state: "done" },
		{ label: "Email", state: "done" },
		{ label: "Payment", state: "done" },
		{ label: "Docs", state: "done" },
		{ label: "Preparation", state: "active" },
		{ label: "Submitted", state: "pending" },
		{ label: "Decision", state: "pending" },
		{ label: "Closed", state: "pending" },
	] as const;

	const timelineRows = [
		{ title: "Registered", note: "26 Mar 2026, 09:14 AM", state: "done" },
		{ title: "Email confirmed", note: "26 Mar 2026, 09:17 AM", state: "done" },
		{ title: "Payment confirmed", note: "26 Mar 2026, 09:22 AM", state: "done" },
		{ title: "Documents received", note: "26 Mar 2026, 11:05 AM", state: "done" },
		{ title: "In preparation", note: "In progress", state: "active" },
		{ title: "Submitted to authorities", note: "Awaiting", state: "pending" },
		{ title: "Decision received", note: "Awaiting", state: "pending" },
		{ title: "Closed", note: "Awaiting", state: "pending" },
	] as const;

	return (
		<div className="flex-1 w-full bg-[#eef5ff] pb-0 pt-0">
			<div className="w-full">
				<Link
					href="/track"
					className="inline-flex items-center gap-2 text-[#6f849f] hover:text-[#0f1f3d] font-body font-bold text-sm mb-6 transition-colors"
				>
					<ArrowLeft className="w-4 h-4" /> Back to Search
				</Link>

				<div className="bg-white min-h-screen pb-0">
						<div className="flex items-center justify-between border-b border-[#e7f0fb] px-4 py-3">
							<div className="flex items-center gap-2">
								<span className="h-4 w-4 rounded-[4px] bg-[#2b65dc]" />
								<span className="font-body font-semibold text-[14px] text-[#17345d]">FlyOCI</span>
							</div>
							<div className="flex items-center gap-3">
								<Link href="/track" className="font-body text-[12px] text-[#2f6fe8] font-medium">Track Application</Link>
								<button className="rounded-[8px] border border-[#d5e3f5] bg-white px-3 py-1.5 font-body text-[12px] text-[#294f7f]">Need Help?</button>
							</div>
						</div>

						<div className="px-4 py-3 border-b border-[#e7f0fb]">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="font-body text-[14px] font-semibold text-[#17345d]">Rajesh Kumar</p>
									<span className="mt-1 inline-flex items-center rounded-[8px] border border-[#cfe0f7] bg-[#f5f9ff] px-2 py-1 font-mono text-[10px] font-semibold text-[#2f6fe8]">
										{ref}
									</span>
								</div>
								<span className="inline-flex items-center rounded-full border border-[#f2d8ac] bg-[#fff6e8] px-3 py-1 text-[10px] font-semibold text-[#a86500]">
									In preparation
								</span>
							</div>

							<div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
								{stages.map((stage, idx) => {
									const isDone = stage.state === "done";
									const isActive = stage.state === "active";

									return (
										<div key={stage.label} className="flex items-center gap-2 min-w-fit">
											<div className="flex flex-col items-center gap-1 min-w-[56px]">
												<span
													className={`h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold ${
														isDone
															? "bg-[#2b65dc] text-white"
															: isActive
																? "border border-[#f0b44e] bg-[#fff6e8] text-[#a86500]"
																: "border border-[#d3deed] bg-[#f8fbff] text-[#98abc3]"
													}`}
												>
													{isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
												</span>
												<span className={`font-body text-[9px] ${isDone ? "text-[#2b65dc]" : isActive ? "text-[#a86500]" : "text-[#9bb0c8]"}`}>
													{stage.label}
												</span>
											</div>

											{idx < stages.length - 1 && (
												<span className={`h-[2px] w-8 ${isDone ? "bg-[#2b65dc]" : "bg-[#d8e4f3]"}`} />
											)}
										</div>
									);
								})}
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-3 p-3">
							<div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
								<p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Status Timeline</p>

								<div className="space-y-2.5">
									{timelineRows.map((row) => {
										const isDone = row.state === "done";
										const isActive = row.state === "active";

										return (
											<div key={row.title} className="flex items-start gap-2.5">
												<span
													className={`mt-0.5 h-[16px] w-[16px] rounded-full flex items-center justify-center ${
														isDone
															? "bg-[#2b65dc] text-white"
															: isActive
																? "border border-[#f0b44e] bg-[#fff6e8] text-[#a86500]"
																: "border border-[#d3deed] bg-[#f8fbff] text-[#9ab0c9]"
													}`}
												>
													{isDone ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
												</span>

												<div className="flex-1 min-w-0">
													<p className={`font-body text-[12px] font-semibold ${isDone ? "text-[#183d70]" : isActive ? "text-[#a86500]" : "text-[#8ea4bf]"}`}>
														{row.title}
													</p>
													<p className="font-body text-[10px] text-[#8ea4bf]">{row.note}</p>

													{isActive && (
														<div className="mt-1.5 rounded-[8px] border border-[#f0cf95] bg-[#fff7e9] px-2 py-1.5">
															<p className="font-body text-[10px] text-[#9a6100]">
																Your application is being prepared for submission. We&apos;ll notify you by email and WhatsApp when submitted.
															</p>
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							<div className="space-y-2">
								<div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
									<p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Application Summary</p>
									<div className="space-y-1.5">
										<p className="font-body text-[11px] text-[#8ba1bb]">File number</p>
										<p className="font-mono text-[11px] font-semibold text-[#2f6fe8]">{ref}</p>
										<p className="font-body text-[11px] text-[#8ba1bb] mt-1">Applicant name</p>
										<p className="font-body text-[12px] font-semibold text-[#183d70]">Rajesh Kumar</p>
										<p className="font-body text-[11px] text-[#8ba1bb] mt-1">Visa type</p>
										<p className="font-body text-[12px] font-semibold text-[#183d70]">1-year Indian e-Visa</p>
									</div>
								</div>

								<div className="rounded-[12px] border border-[#d8e4f3] bg-white p-3">
									<p className="font-body text-[10px] tracking-[0.06em] text-[#9bb0c8] uppercase font-semibold mb-2">Actions</p>
									<div className="space-y-2">
										<button className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2">
											<Download className="h-4 w-4" /> Download acknowledgment
										</button>
										<button className="w-full rounded-[8px] border border-[#cfe8d9] bg-[#edf9f2] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1e7348] hover:bg-[#e4f6ec] transition-colors inline-flex items-center gap-2">
											<MessageCircle className="h-4 w-4" /> WhatsApp support
										</button>
										<button className="w-full rounded-[8px] border border-[#d5e3f5] bg-[#f8fbff] px-3 py-2 text-left font-body text-[11px] font-semibold text-[#1f4f8f] hover:bg-[#eef5ff] transition-colors inline-flex items-center gap-2">
											<Mail className="h-4 w-4" /> Email support
										</button>
									</div>
								</div>
							</div>
						</div>
				</div>
			</div>
		</div>
	);
}
