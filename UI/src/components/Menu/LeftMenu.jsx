import React, { useEffect } from "react";
import {
  Box,
  Flex,
  IconButton,
  useBreakpointValue,
  VStack,
  Link,
  Text,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { FiMenu, FiX, FiHome, FiBox, FiTruck } from "react-icons/fi";
import {
  RiBillLine,
  RiMoneyDollarCircleLine,
  RiPieChartLine,
  RiUserAddLine,
  RiToolsLine,
  RiAdminLine,
} from "react-icons/ri";
import { Outlet, Link as RouterLink, useLocation } from "react-router-dom";
import { getLocalStorageItem } from "../../utils/localStoragesHelper";
import { useMenu } from "../../components/Menuprovider";
import Header from "../../components/Header/Header";
import "../../App.css";
import "../../index.css";

const LeftMenu = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const location = useLocation();

  const {
    isMenuOpen,
    toggleMenu,
    isMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  } = useMenu();

  const storedUser = getLocalStorageItem("user");
  const savedconfig = localStorage.getItem("companyConfig");
  const parsed = savedconfig ? JSON.parse(savedconfig) : null;
  const config = parsed?.value || parsed;

  const baseMenu = [
    { icon: FiHome, label: "Dashboard", href: "/dashboard" },
    { icon: RiBillLine, label: "Invoice", href: "/invoice" },
    { icon: RiToolsLine, label: "Service", href: "/service" },
    { icon: FiBox, label: "Stock", href: "/stock" },
    { icon: FiTruck, label: "Supplier", href: "/supplier" },
    { icon: RiMoneyDollarCircleLine, label: "Expense", href: "/expense" },
    { icon: RiPieChartLine, label: "Report", href: "/report" },
    { icon: RiUserAddLine, label: "Register", href: "/register" },
  ];

  let menuItems = [...baseMenu];

  if (storedUser?.role === "superadmin") {
    menuItems.unshift({ icon: RiAdminLine, label: "Admin", href: "/admin" });
  } else if (storedUser?.role === "admin") {
    menuItems = baseMenu.filter((item) => item.label !== "Admin");
  } else if (storedUser?.role === "user") {
    menuItems = baseMenu.filter((item) =>
      ["Invoice", "Service"].includes(item.label)
    );
  }

  const showText = isMobile ? isMobileMenuOpen : isMenuOpen;

  const logo = config?.logo_url
    ? `${import.meta.env.VITE_API_BASE_URL}${config.logo_url}`
    : null;
  const isActiveLink = (href) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  useEffect(() => {
    if (isMobile) closeMobileMenu();
  }, [location.pathname]);

  return (
    <Flex h="100vh" overflow="hidden" bg="gray.50">
      {/* Sidebar */}
      <Box
        as="nav"
        className={`sidebar ${
          isMobile
            ? isMobileMenuOpen
              ? "open"
              : "collapsed"
            : isMenuOpen
            ? "open"
            : "collapsed"
        }`}
        w={isMobile ? "250px" : isMenuOpen ? "200px" : "70px"}
        position={isMobile ? "fixed" : "relative"}
      >
        <Flex direction="column" h="full">
          {/* Logo */}
          <Flex
            className="sidebar-logo"
            justify={showText ? "flex-start" : "center"}
          >
            <img src="/logo.png" alt="TechAppzy Logo" />
            {showText && (
              <Box>
                <Text className="sidebar-logo-text">TechAppzy</Text>
                <Text className="sidebar-logo-sub">Business Suite</Text>
              </Box>
            )}
          </Flex>

          {/* Mobile Menu Close */}
          {isMobile && (
            <Flex justify="flex-end" p={2}>
              <IconButton
                icon={<FiX />}
                aria-label="Close menu"
                className="icon-btn"
                onClick={closeMobileMenu}
              />
            </Flex>
          )}

          {/* Menu Items */}
          <VStack className="sidebar-menu" align="stretch">
            {menuItems.map((item, i) => {
              const active = isActiveLink(item.href);

              return (
                <Tooltip
                  key={i}
                  label={item.label}
                  placement="right"
                  hasArrow
                  isDisabled={showText}
                  openDelay={300}
                  bg="var(--color-brand-primary)"
                  color="white"
                >
                  <Link
                    as={RouterLink}
                    to={item.href}
                    onClick={() => isMobile && closeMobileMenu()}
                    className={`menu-link ${active ? "active" : ""}`}
                  >
                    <Icon as={item.icon} className="menu-icon" />
                    {showText && <Text>{item.label}</Text>}
                  </Link>
                </Tooltip>
              );
            })}
          </VStack>

          {/* User Info */}
          {showText && storedUser && (
            <Box className="sidebar-user">
              <Text className="sidebar-user-name">
                {storedUser.name || storedUser.email}
              </Text>
              <Text className="sidebar-user-role">{storedUser.role}</Text>
            </Box>
          )}
        </Flex>
      </Box>

      {/* Main Content */}
      <Box flex="1" overflowY="auto">
        <Header />
        <Box p={5}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
};

export default LeftMenu;
