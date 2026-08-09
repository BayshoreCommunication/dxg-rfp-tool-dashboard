// Backend requires a minimum of 6 characters (credentialAuthentication.ts);
// everything beyond that only feeds the strength meter.
export const PASSWORD_MIN_LENGTH = 6;

export const passwordStrength = (password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) return 0;
  let score = 1;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-gray-200",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-500",
];
const STRENGTH_TEXT_COLORS = [
  "text-gray-400",
  "text-red-500",
  "text-orange-500",
  "text-yellow-600",
  "text-green-600",
];

export const PasswordStrengthMeter = ({ password }: { password: string }) => {
  if (!password) {
    return (
      <p className="mt-2 text-xs font-medium text-gray-400">
        Must be at least {PASSWORD_MIN_LENGTH} characters.
      </p>
    );
  }
  const score = passwordStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              score >= segment ? STRENGTH_COLORS[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p
        className={`mt-1.5 text-xs font-semibold ${STRENGTH_TEXT_COLORS[score]}`}
      >
        {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
};
