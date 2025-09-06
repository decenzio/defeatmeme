"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Play",
    href: "/game",
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: <TrophyIcon className="h-4 w-4" />,
  },
  {
    label: "Debug",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-white/80 hover:text-white border border-transparent"
              } hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-purple-500/10 hover:border-cyan-500/20 py-2 px-4 text-sm rounded-full gap-2 flex items-center transition-all duration-200 font-medium`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-black/80 backdrop-blur-md border-b border-cyan-500/20 min-h-0 shrink-0 justify-between z-20 px-4 sm:px-6">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-cyan-500/10 text-white">
            <Bars3Icon className="h-6 w-6" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-black/90 backdrop-blur-md border border-cyan-500/20 rounded-xl w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-3 ml-4 mr-8 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="Zircuit Cat" className="cursor-pointer rounded-full" fill src="/cat/cat1.png" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              DefeatTheMeme
            </span>
            <span className="text-xs text-cyan-400/80">Zircuit Cat Adventures</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-1">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-2">
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
