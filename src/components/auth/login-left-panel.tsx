import Image, { StaticImageData } from 'next/image';
import { Users, Tent, UserRound, UsersRound } from 'lucide-react';
import bosscoder_logo from '@/assets/images/bosscoder_logo.svg';
import about_heroImage from '@/assets/images/teams/about_heroImg2.webp';
import about_heroImage3 from '@/assets/images/teams/about_heroImg3.webp';
import about_heroImage4 from '@/assets/images/teams/about_heroImg4.webp';
import main_img from '@/assets/images/teams/about_heroImg1.webp';

export function LoginLeftPanel() {
  return (
    <div className="relative overflow-hidden bg-[#202658] text-white flex flex-col justify-between p-8 md:p-8 w-full min-h-[220px] md:min-h-0">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/[0.03]" />

      <div className="relative z-10">
        <Image src={bosscoder_logo} alt="Bosscoder" width={150} height={72} />
      </div>

      <div className="relative z-10 hidden md:grid grid-cols-3 grid-rows-[auto_auto] gap-2 my-8">

        <PhotoTile
          src={about_heroImage}
          alt="Bosscoder founders"
          Icon={UserRound}
          label="Meet the founders"
          className="row-span-2 rounded-[8px] min-h-[180px]"
          position="object-top"
        />

        {/* Wide — cols 2–3, row 1 */}
        <PhotoTile
          src={main_img}
          alt="Bosscoder team"
          Icon={UsersRound}
          className="col-span-2 rounded-[8px] min-h-[180px]"
          position="object-center"
        />

        {/* Small — col 2, row 2 */}
        <PhotoTile
          src={about_heroImage4}
          alt="Team trip"
          Icon={Tent}
          className="rounded-[8px] min-h-[160px]"
          position="object-top"
        />

 
        <PhotoTile
          src={about_heroImage3}
          alt="Bosscoder crew"
          Icon={Users}
          className="rounded-[8px] min-h-[130px]"
          position="object-center"
        />
      </div>

      {/* Bottom: tagline */}
      <div className="relative z-10">
        <p className="md:text-[32px] text-[24px]  font-medium">Built by coders, for coders.</p>
        <p className="md:text-[20px] text-[14px] text-white/70 mt-1.5">
          Fun fridays, team trips, launch parties — a peek at life at Bosscoder.
        </p>
      </div>
    </div>
  );
}

interface PhotoTileProps {
  src: string | StaticImageData;
  alt: string;
  Icon: React.ElementType;
  className?: string;
  position?: string;
  label?: string;
}

function PhotoTile({ src, alt, Icon, className = '', position = 'object-center', label }: PhotoTileProps) {
  return (
    <div className={`group relative overflow-hidden cursor-pointer ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${position} transition-transform duration-500 group-hover:scale-105`}
        sizes="(max-width: 768px) 0vw, 25vw"
      />
      {/* base gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* hover dim overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* hover label */}
      {label && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Icon size={18} className="text-white drop-shadow" />
          <span className="text-white text-[11px] font-semibold tracking-wide drop-shadow text-center px-2">
            {label}
          </span>
        </div>
      )}

      {!label && (
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <Icon size={15} className="text-white/80" />
        </div>
      )}
    </div>
  );
}
