import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
} from "@chakra-ui/react";
import { SearchIcon, SettingsIcon } from "@chakra-ui/icons";

export default function AdminPage() {
  return (
    <Flex minH="100vh" bg="#f8f9fb" color="gray.800">
      {/* Main Content */}
      <Flex direction="column" flex="1">
        {/* Header */}
        <Flex
          justify="space-between"
          align="center"
          bg="white"
          borderBottom="1px solid #E5E7EB"
          p={4}
        >
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input placeholder="Search..." size="sm" />
          </InputGroup>

          <Flex align="center" gap={3}>
            <IconButton
              icon={<SettingsIcon />}
              size="sm"
              variant="ghost"
              aria-label="Settings"
            />
            <Avatar size="sm" name="Admin User" />
          </Flex>
        </Flex>

        {/* Content Area */}
        <Box p={6}>
          <Text fontSize="xl" fontWeight="semibold" mb={5}>
            Dashboard Overview
          </Text>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
            <Card bg="white" shadow="sm" border="1px solid #E5E7EB">
              <CardHeader fontWeight="bold" fontSize="md">
                Total Users
              </CardHeader>
              <CardBody>
                <Text fontSize="2xl" fontWeight="bold" color="#012AF6">
                  1,245
                </Text>
              </CardBody>
            </Card>

            <Card bg="white" shadow="sm" border="1px solid #E5E7EB">
              <CardHeader fontWeight="bold" fontSize="md">
                Active Products
              </CardHeader>
              <CardBody>
                <Text fontSize="2xl" fontWeight="bold" color="#012AF6">
                  312
                </Text>
              </CardBody>
            </Card>

            <Card bg="white" shadow="sm" border="1px solid #E5E7EB">
              <CardHeader fontWeight="bold" fontSize="md">
                Monthly Revenue
              </CardHeader>
              <CardBody>
                <Text fontSize="2xl" fontWeight="bold" color="#012AF6">
                  ₹84,560
                </Text>
              </CardBody>
            </Card>
          </SimpleGrid>

          <Card mt={6} bg="white" shadow="sm" border="1px solid #E5E7EB">
            <CardHeader fontWeight="bold" fontSize="md">
              Recent Activity
            </CardHeader>
            <CardBody>
              <Text color="gray.600">No recent updates yet.</Text>
            </CardBody>
          </Card>
        </Box>
      </Flex>
    </Flex>
  );
}
