// import ClientResult from "./ResultClient";

// export const metadata = {
//   title: "BEU Result - AlphaResult",
//   description:
//     "Check your Bihar Engineering University (BEU) semester results quickly using your registration number.",
// };

// export default function ResultPage() {
//   // return <ClientResult/>
//   return <div>
//     {/* Check result at  */}
//   {/* https://beu-bih.ac.in/result-two/B.Tech%203rd%20Semester%20Examination%202025?d=eyJzZW1lc3RlciI6Mywic2Vzc2lvbiI6IjIwMjUiLCJleGFtX2hlbGQiOiJBcHJpbC8yMDI2IiwiZXhhbV9pZCI6IjI1MDEwMyJ9 */}

//     <a href="https://beu-bih.ac.in/result-two/B.Tech%203rd%20Semester%20Examination%202025?d=eyJzZW1lc3RlciI6Mywic2Vzc2lvbiI6IjIwMjUiLCJleGFtX2hlbGQiOiJBcHJpbC8yMDI2IiwiZXhhbV9pZCI6IjI1MDEwMyJ9" target="_blank">Check result at https://beu-bih.ac.in/result-two/B.Tech%203rd%20Semester%20Examination%202025?d=eyJzZW1lc3RlciI6Mywic2Vzc2lvbiI6IjIwMjUiLCJleGFtX2hlbGQiOiJBcHJpbC8yMDI2IiwiZXhhbV9pZCI6IjI1MDEwMyJ9</a>
//   </div>
// }



"use client";

import Link from "next/link";

export default function ResultPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Important Update Regarding BEU Results
          </h1>

          <p className="mt-3 text-slate-600">
            Please read the following update before checking your result.
          </p>
        </div>

        {/* Main Notice */}
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
          {/* Alert Header */}
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-amber-900">
              Results are currently unavailable on Alpha Result
            </h2>
          </div>

          {/* Content */}
          <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
            <p className="leading-7 text-slate-700">
              We’ve noticed that many students are trying to check their
              results through{" "}
              <span className="font-semibold text-slate-900">
                alpharesult.in/result
              </span>
              , but the result is currently not being displayed.
            </p>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Why is this happening?
              </h3>

              <p className="leading-7 text-slate-700">
                Bihar Engineering University (BEU) has introduced{" "}
                <span className="font-semibold">
                  CAPTCHA and token-based verification
                </span>{" "}
                on its result portal. Due to this new verification system,
                Alpha Result cannot currently fetch and display BEU results.
              </p>
            </div>

            {/* Official Website */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <h3 className="mb-2 text-lg font-semibold text-blue-900">
                Check your result on the official BEU website
              </h3>

              <p className="mb-5 leading-6 text-blue-800">
                For now, BEU results can only be checked through the official
                BEU result portal.
              </p>

              <a
                href="https://beu-bih.ac.in/result-one"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center justify-center
                  rounded-lg
                  bg-blue-600
                  px-5 py-3
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:ring-offset-2
                "
              >
                Open Official BEU Result Portal
                <span className="ml-2">↗</span>
              </a>
            </div>

            {/* Future Update */}
            <div className="border-t border-slate-200 pt-6">
              <p className="leading-7 text-slate-600">
                We apologize for the inconvenience and thank you for your
                understanding.
              </p>

              <p className="mt-3 leading-7 text-slate-600">
                We’ll update this page if access through Alpha Result becomes
                available again.
              </p>
            </div>
          </div>
        </div>

        {/* Back / Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="font-medium text-[#5B2EBD] hover:underline"
          >
            ← Back to Alpha Result
          </Link>
        </div>
      </div>
    </main>
  );
}