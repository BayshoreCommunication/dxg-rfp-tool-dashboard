import { ChevronDown } from "lucide-react";

const labelClass =
  "mb-2 flex items-center justify-between text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const InfoDot = () => (
  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7b7ec8] text-[10px] font-bold text-white">
    i
  </span>
);

const SelectCaret = () => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
    <ChevronDown size={20} />
  </span>
);

const SignaturesSettings = () => {
  return (
    <section className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
      <h2 className="text-xl font-semibold leading-none text-[#0f1b57] md:text-[26px]">
        Signatures
      </h2>
      <p className="mt-2 text-base leading-tight text-[#1f2d5d] md:text-[16px]">
        Define your default signature style and select signing options for
        prospects.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-x-9 gap-y-6 md:grid-cols-2">
        <div>
          <label htmlFor="signatureType" className={labelClass}>
            <span>Your Signature Type</span>
            <InfoDot />
          </label>
          <div className="relative">
            <select
              id="signatureType"
              defaultValue="Type"
              className={inputClass + " appearance-none pr-8"}
            >
              <option>Type</option>
              <option>Upload</option>
              <option>Draw</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="prospectOptions" className={labelClass}>
            <span>Prospect&apos;s Signature Options</span>
            <InfoDot />
          </label>
          <div className="relative flex min-h-10 w-full items-center gap-1 rounded-md border border-[#d7dce3] bg-white px-2 py-1 pr-8">
            <span className="rounded-sm bg-[#eef0f3] px-2 py-1 text-sm text-[#1f2d5d]">
              Type x
            </span>
            <span className="rounded-sm bg-[#eef0f3] px-2 py-1 text-sm text-[#1f2d5d]">
              Upload x
            </span>
            <span className="rounded-sm bg-[#eef0f3] px-2 py-1 text-sm text-[#1f2d5d]">
              Draw x
            </span>
            <input id="prospectOptions" className="sr-only" readOnly />
            <SelectCaret />
          </div>
        </div>

        <div>
          <div className="mt-1 flex h-[160px] items-center justify-center rounded-md border border-[#d7dce3] bg-white">
            <span
              className="text-4xl text-[#2b2f84] md:text-[52px]"
              style={{
                fontFamily: '"Brush Script MT", "Segoe Script", cursive',
              }}
            >
              ui.abukawsar
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignaturesSettings;
