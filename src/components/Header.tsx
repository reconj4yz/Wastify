// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Menu,
  Coins,
  Leaf,
  Search,
  Bell,
  User,
  ChevronDown,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  createUser,
  getUnreadNotifications,
  markNotificationAsRead,
  getUserByEmail,
  getUserBalance,
} from "@/utils/db/actions";
import Image from "next/image";

const clientId =
  "BM1TbBgipafOVocBMS9vkA_L4YZaGMTqiWaUMOdnV_RaRtqCP0VWesZbBdro3fPS1rtK7lfOAhmBMiUcA-usYc8";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Ethereum Sepolia Testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET, // Changed from SAPPHIRE_MAINNET to TESTNET
  privateKeyProvider,
});

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [balance, setBalance] = useState(0);

  console.log("user info", userInfo);

  useEffect(() => {
    const init = async () => {
      try {
        await web3auth.initModal();
        setProvider(web3auth.provider);

        if (web3auth.connected) {
          setLoggedIn(true);
          const user = await web3auth.getUserInfo();
          setUserInfo(user);
          if (user.email) {
            localStorage.setItem("userEmail", user.email);
            try {
              await createUser(user.email, user.name || "Anonymous User");
            } catch (error) {
              console.error("Error creating user:", error);
              // Handle the error appropriately, maybe show a message to the user
            }
          }
        }
      } catch (error) {
        console.error("Error initializing Web3Auth:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const unreadNotifications = await getUnreadNotifications(user.id);
          setNotifications(unreadNotifications);
        }
      }
    };

    fetchNotifications();

    // Set up periodic checking for new notifications
    const notificationInterval = setInterval(fetchNotifications, 30000); // Check every 30 seconds

    return () => clearInterval(notificationInterval);
  }, [userInfo]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const userBalance = await getUserBalance(user.id);
          setBalance(userBalance);
        }
      }
    };

    fetchUserBalance();

    // Add an event listener for balance updates
    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener(
      "balanceUpdated",
      handleBalanceUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "balanceUpdated",
        handleBalanceUpdate as EventListener
      );
    };
  }, [userInfo]);

  const login = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      setLoggedIn(true);
      const user = await web3auth.getUserInfo();
      setUserInfo(user);
      if (user.email) {
        localStorage.setItem("userEmail", user.email);
        try {
          await createUser(user.email, user.name || "Anonymous User");
        } catch (error) {
          console.error("Error creating user:", error);
          // Handle the error appropriately, maybe show a message to the user
        }
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    if (!web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }
    try {
      await web3auth.logout();
      setProvider(null);
      setLoggedIn(false);
      setUserInfo(null);
      localStorage.removeItem("userEmail");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getUserInfo = async () => {
    if (web3auth.connected) {
      const user = await web3auth.getUserInfo();
      setUserInfo(user);
      if (user.email) {
        localStorage.setItem("userEmail", user.email);
        try {
          await createUser(user.email, user.name || "Anonymous User");
        } catch (error) {
          console.error("Error creating user:", error);
          // Handle the error appropriately, maybe show a message to the user
        }
      }
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications((prevNotifications) =>
      prevNotifications.filter(
        (notification) => notification.id !== notificationId
      )
    );
  };


  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/report", label: "Report" },
    { href: "/collect", label: "Collect" },
    { href: "/rewards", label: "Reward" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/calculator", label: "Calculator" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 70 }}
      className="bg-white shadow-md sticky top-0 z-50 backdrop-blur-lg border-b border-gray-200"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo & Hamburger */}
        <motion.div whileHover={{ scale: 1.05 }} className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/" className="flex items-center">
            <Image src="/w.png" alt="logo" width={60} height={60} />
            <div className="flex flex-col ml-1">
              <span className="font-bold text-lg text-gray-800">
                Wastify
              </span>
              <span className="text-[10px] text-gray-400 -mt-1">
                HackOClock
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Navigation Links */}
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <motion.div
              key={link.href}
              whileHover={{ scale: 1.05, color: "#16a34a" }}
            >
              <Link
                href={link.href}
                className={`${
                  pathname === link.href ? "text-green-600" : "text-gray-700"
                } transition-colors duration-200`}
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {isMobile && (
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          <motion.div whileTap={{ scale: 0.9 }} className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div>
                        <span className="font-semibold">
                          {notification.type}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {notification.message}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>

          {/* {!loggedIn ? (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={login}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Login
                <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center gap-1"
                  >
                    <User className="h-5 w-5" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={getUserInfo}>
                  {userInfo ? userInfo.name : "Fetch User Info"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )} */}
        </div>
      </div>
    </motion.header>
  );
}
