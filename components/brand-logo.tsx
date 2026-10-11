import Image from "next/image";

export function BrandLogo({ compact = false, height = 44 }: { compact?: boolean; height?: number }) {
  return (
    <Image
      src="/brand/preach-the-gospel-logo.png"
      alt="Preach the Gospel"
      width={500}
      height={261}
      priority
      className="max-w-full object-contain"
      style={compact ? { width: 40, height: "auto" } : { height, width: "auto" }}
    />
  );
}
