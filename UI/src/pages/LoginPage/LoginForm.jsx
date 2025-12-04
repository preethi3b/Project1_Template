import {
  Box,
  Button,
  Flex,
  FormControl,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Image,
  Select,
  Text,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useFileContext } from "../../context/Filecontext";
import { setLocalStorageItem } from "../../utils/localStoragesHelper";
import { showToast } from "../../utils/toast";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState("");
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const navigate = useNavigate();
  const { setUsers } = useFileContext();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.logo_url) {
          setCompanyLogo(`${API_BASE}${data.logo_url}`);
        }
        if (data?.name) {
          setCompanyName(data.name);
        }
        setLocalStorageItem("companyConfig", data);
      })
      .catch(() => {});
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      await setUsers(data.user);
      await setLocalStorageItem("user", data.user);
      if (!res.ok) {
        showToast({
          title: "Login failed",
          description: data.message || "Invalid email or password",
          status: "error",
        });
        setIsLoading(false);
        return;
      }

      await setUsers(data.user);
      await setLocalStorageItem("user", data.user);

      showToast({
        title: "Login successful",
        description: "Redirecting to your dashboard...",
        status: "success",
      });

      navigate("/dashboard");
    } catch (error) {
      showToast({
        title: "Connection error",
        description: "Could not connect to server.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex className="login-wrapper">
      <Box className="login-card">
        <Stack spacing={5} align="center" mb={4}>
          {companyLogo && (
            <Image
              src={companyLogo}
              alt="Company Logo"
              className="login-logo"
            />
          )}

          <Text className="login-title" fontFamily={"inter"}>
            {companyName ? `Welcome to ${companyName}` : "Welcome Back"}
          </Text>
        </Stack>

        <form onSubmit={handleSubmit} className="login-form">
          <Stack spacing={4}>
            <FormControl isRequired>
              <Input
                className="input-primary"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <InputGroup>
                <Input
                  className="input-primary"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <InputRightElement>
                  <Button
                    className="icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    p={1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <Select
                className="input-primary"
                placeholder="Select role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="manager">Manager</option>
              </Select>
            </FormControl>

            <Button
              type="submit"
              className="btn-primary"
              size={"sm"}
              isLoading={isLoading}
              loadingText="Signing in..."
            >
              Sign In
            </Button>
          </Stack>
        </form>
      </Box>
    </Flex>
  );
}
