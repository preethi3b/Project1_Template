import {
  Box,
  Flex,
  Text,
  Input,
  Textarea,
  Button,
  FormLabel,
  Image,
  VStack,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";

const MotionBox = motion(Box);

export default function AdminPage({ onClose, onBack }) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gst: "",
    logo: null,
    logoPreview: null,
  });

  // 🔥 Fetch config when page opens
  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setForm({
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            gst: data.gst || "",
            logo: null,
            logoPreview: data.logo_url ? `${API_BASE}${data.logo_url}` : null,
          });
        }
      })
      .catch((err) => console.error("Config load error:", err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, logo: file, logoPreview: URL.createObjectURL(file) });
      e.target.value = null;
    }
  };

  const handleLogoClear = () => {
    if (form.logoPreview) URL.revokeObjectURL(form.logoPreview);
    setForm({ ...form, logo: null, logoPreview: null });
  };

  // 🔥 Save button API integration
  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("address", form.address);
    formData.append("phone", form.phone);
    formData.append("email", form.email);
    formData.append("gst", form.gst);
    if (form.logo) formData.append("logo", form.logo);

    const res = await fetch(`${API_BASE}/config`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    alert(result.message);

    // Optional — store config locally after save
    const fetched = await fetch(`${API_BASE}/config`);
    const configData = await fetched.json();
    localStorage.setItem("companyConfig", JSON.stringify(configData));
  };

  const logoAnimationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <Box p="1rem">
      {/* Header */}
      <Flex
        className="page-header"
        justify="space-between"
        align="center"
        mb="1rem"
      >
        <Flex align="center" gap="0.5rem" cursor="pointer" onClick={onBack}>
          <Text className="page-title">Company Configuration</Text>
        </Flex>
      </Flex>

      {/* Form Card */}
      <Box className="table-card" p="1.2rem">
        <VStack spacing="0.9rem" align="stretch">
          <Box>
            <FormLabel>Company Name</FormLabel>
            <Input
              className="input-primary"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </Box>

          <Box>
            <FormLabel>Company Address</FormLabel>
            <Textarea
              className="input-primary"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </Box>

          <Flex gap="1rem" flexWrap="wrap">
            <Box flex="1">
              <FormLabel>Phone Number</FormLabel>
              <Input
                className="input-primary"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </Box>
            <Box flex="1">
              <FormLabel>Email</FormLabel>
              <Input
                className="input-primary"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </Box>
          </Flex>

          <Box>
            <FormLabel>GST Number</FormLabel>
            <Input
              className="input-primary"
              name="gst"
              value={form.gst}
              onChange={handleChange}
            />
          </Box>

          {/* Logo Section */}
          <Box>
            <FormLabel>Brand Logo</FormLabel>
            <Flex align="flex-end" gap="1rem">
              {form.logoPreview ? (
                <MotionBox
                  initial="hidden"
                  animate="visible"
                  variants={logoAnimationVariants}
                  w="100px"
                  h="100px"
                  p="0.5rem"
                  border="1px solid #ddd"
                  borderRadius="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Image
                    src={form.logoPreview}
                    alt="Brand Logo Preview"
                    maxW="100%"
                    maxH="100%"
                    objectFit="contain"
                  />
                </MotionBox>
              ) : (
                <Box
                  w="100px"
                  h="100px"
                  border="1px dashed"
                  borderColor="gray.300"
                  borderRadius="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.500"
                  fontSize="sm"
                >
                  No Logo
                </Box>
              )}

              <Flex direction="column" gap="0.5rem">
                <Input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                  display="none"
                />

                <Button
                  as="label"
                  htmlFor="logo-upload"
                  leftIcon={<EditIcon />}
                  className="btn-primary"
                  size="sm"
                >
                  {form.logo ? "Change Logo" : "Upload Logo"}
                </Button>

                {form.logoPreview && (
                  <Button
                    leftIcon={<DeleteIcon />}
                    onClick={handleLogoClear}
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                  >
                    Remove Logo
                  </Button>
                )}
              </Flex>
            </Flex>
          </Box>

          <Flex justify="flex-end" gap="0.7rem" mt="1rem">
            <Button className="btn-cancel" onClick={onClose}>
              Cancel
            </Button>
            <Button className="btn-primary" onClick={handleSubmit}>
              Save
            </Button>
          </Flex>
        </VStack>
      </Box>
    </Box>
  );
}
