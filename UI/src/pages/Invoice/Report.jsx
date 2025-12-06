import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Tooltip,
  Thead,
  Tr,
  useDisclosure,
  Modal,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Select,
  Card,
  IconButton,
  CardHeader,
  CardBody,
  Avatar,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useColorModeValue,
  SimpleGrid,
  useToast,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import {
  FiEye,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiDownload,
} from "react-icons/fi";
import axios from "axios";
import { showToast } from "../../utils/toast";
import { generatePDF } from "../../components/DownloadHelper/DownloadPDF";
import { generateXLSX } from "../../components/DownloadHelper/DownloadXLSX";

const Report = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isAlertOpen,
    onOpen: onAlertOpen,
    onClose: onAlertClose,
  } = useDisclosure();
  const {
    isOpen: isReportOpen,
    onOpen: onReportOpen,
    onClose: onReportClose,
  } = useDisclosure();

  const cancelRef = useRef();
  const toast = useToast();

  const [formData, setFormData] = useState({
    invoiceNo: "",
    customerName: "",
    mobileNumber: "",
    Amount: "",
  });
  const [services, setServices] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [report, setReport] = useState(null);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [loading, setLoading] = useState(false); // Spinner state
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [sumAmount, setSumAmount] = useState(0);

  const cardBg = useColorModeValue("white", "gray.700");
  const tableBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.600");

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const sum = invoiceData.reduce(
      (acc, row) => acc + Number(row.amount || 0),
      0
    );
    setSumAmount(sum);
  }, [invoiceData]);

  const handleDownloadPDF = () => {
    generatePDF(invoiceData, sumAmount);
  };

  const handleDownloadXLSX = () => {
    generateXLSX(invoiceData, sumAmount);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/get_invoice`
      );
      const data = await response.json();
      if (response.ok) {
        const formatted = data.map((item, index) => ({
          id: item.id || index + 1,
          invoiceNo: item.invoice_id,
          customerName: item.customer_name,
          mobileNumber: item.mobile_number,
          amount: item.total,
          cre_date: item.created_at,
          discount: item.discount,
          total: item.final_amount,
        }));
        setInvoiceData(formatted);
      } else {
        console.error("Failed to fetch invoices");
      }
    } catch (error) {
      console.error("Fetch invoices error:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (invoiceNo) => {
    setSelectedInvoiceNo(invoiceNo);
    onAlertOpen();
  };

  const handleDelete = async (invoiceNo) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/delete_invoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNo }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        showToast({
          title: "Deleted",
          description: data.message,
          status: "success",
        });
        fetchInvoices(); // refresh list
      } else {
        showToast({
          title: "Delete failed",
          description: data.message,
          status: "error",
        });
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast({
        title: "Error",
        description: "An error occurred while deleting invoice",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handeleSearch = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (formData.startDate)
        queryParams.append("startDate", formData.startDate);
      if (formData.endDate) queryParams.append("endDate", formData.endDate);

      const endpoint =
        formData.type === "service"
          ? `${import.meta.env.VITE_API_BASE_URL}/service_filter`
          : `${import.meta.env.VITE_API_BASE_URL}/invoice_filter`;

      const response = await fetch(`${endpoint}?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setServices(data.totalCost);
        if (formData.type === "service") {
          const formatted = data.data.map((item, index) => ({
            id: item.id || index + 1,
            service_no: item.service_no,
            customer_name: item.cus_name,
            issue_details: item.issue_details,
            amount: item.actual_cost,
            delivery_date: item.created_at,
          }));
          setServiceData(formatted);
        } else {
          const formatted = data.data.map((item, index) => ({
            id: item.id || index + 1,
            invoiceNo: item.invoice_id,
            customerName: item.customer_name,
            mobileNumber: item.mobile_number,
            amount: item.total,
            cre_date: item.created_at,
          }));
          setInvoiceData(formatted);
        }

        setFormData((prev) => ({
          ...prev,
          startDate: "",
          endDate: "",
        }));
      } else {
        console.error("Search fetch failed");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };
  // const handleOpen = async () => {
  //   setLoading(true);
  //   try {
  //     // Get today's date in YYYY-MM-DD format
  //     const today = new Date();
  //     const yyyy = today.getFullYear();
  //     const mm = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  //     const dd = String(today.getDate()).padStart(2, "0");
  //     const currentDate = `${yyyy}-${mm}-${dd}`;

  //     // Fetch daily report with current date
  //     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/daily_report?startDate=${currentDate}`);
  //     const data = await response.json();

  //     setReport(data);
  //     onOpen();
  //   } catch (error) {
  //     console.error("Error fetching daily report:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleView = async (invoiceNo) => {
  //   setLoading(true);
  //   try {
  //     const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/invoice-rep/${invoiceNo}`);
  //     if (response.data.length === 0) {
  //       setInvoiceItems([]);
  //       setInvoiceDiscount(0);
  //       setInvoiceTotal(0); // Reset total
  //     } else {
  //       setInvoiceItems(response.data);
  //       const firstItem = response.data[0];
  //       const discount = parseFloat(firstItem?.discount) || 0;
  //       const total = parseFloat(firstItem?.total) || 0;

  //       // Set values
  //       setInvoiceDiscount(discount);
  //       setInvoiceTotal(total - discount);
  //       onReportOpen();
  //     }
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Helper function to calculate subtotal

  const handleOpen = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const currentDate = `${yyyy}-${mm}-${dd}`;

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/daily_report?startDate=${currentDate}`
      );

      const data = await response.json();

      setReport(data);

      // NEW BEHAVIOR
      setShowDailyReport(true); // show daily report panel
      setRightPanelOpen(true); // open right panel
      setSelectedInvoice(null); // remove invoice view
    } catch (error) {
      console.error("Error fetching daily report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (invoiceNo) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/invoice-rep/${invoiceNo}`
      );

      if (response.data.length > 0) {
        setSelectedInvoice({
          invoiceNo,
          customerName: response.data[0].customer_name,
          mobile: response.data[0].mobile_number,
        });

        setInvoiceItems(response.data);

        const discount = parseFloat(response.data[0].discount || 0);
        const total = parseFloat(response.data[0].total || 0);

        setInvoiceDiscount(discount);
        setInvoiceTotal(total - discount);

        setRightPanelOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    // Sum the 'amount' field from all items, converting to number
    return invoiceItems.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
  };

  const subtotal = calculateSubtotal();

  // Convert numerical values to fixed two decimal strings for display
  const formatCurrency = (value) => `₹${Number(value).toFixed(2)}`;
  return (
    <>
      {/* LOADING OVERLAY */}
      {loading && (
        <Box className="loading-overlay">
          <Spinner size="xl" color="#625DF0" />
          <Text>Retrieving records, please wait...</Text>
        </Box>
      )}

      {/* MAIN LAYOUT (FULL PAGE) */}
      <Flex height="100vh" overflow="hidden" bg="gray.50">
        {/* ===========================
          LEFT SIDE (Filters + Table)
      ============================ */}
        <Box
          width={isRightPanelOpen ? "420px" : "100%"}
          minWidth={isRightPanelOpen ? "420px" : "100%"}
          maxWidth={isRightPanelOpen ? "420px" : "100%"}
          height="100%"
          overflowY="auto"
          transition="all 0.3s ease"
          p={4}
          bg="white"
          borderRight={isRightPanelOpen ? "1px solid #e5e7eb" : "none"}
        >
          {/* HEADER + FILTER BUTTON */}
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="xl" fontWeight="600">
              Report
            </Text>

            {/* FILTER BUTTON LIKE ZOHO */}
            <Box position="relative">
              <Flex justify="flex-end" align="center" gap={3}>
                {/* DOWNLOAD BUTTON */}
                <Menu>
                  <MenuButton
                    as={Button}
                    leftIcon={<FiDownload />}
                    size="sm"
                    bg="#E0F2FE"
                    color="#0369A1"
                    borderRadius="md"
                    _hover={{ bg: "#BAE6FD" }}
                  >
                    Download
                  </MenuButton>

                  <MenuList>
                    <MenuItem onClick={() => handleDownloadPDF()}>
                      PDF Format
                    </MenuItem>
                    <MenuItem onClick={() => handleDownloadXLSX()}>
                      XLSX Format
                    </MenuItem>
                  </MenuList>
                </Menu>

                {/* EXISTING FILTER BUTTON */}
                <Button
                  leftIcon={<FiFilter size={18} />}
                  size="sm"
                  bg="#EEF2FF"
                  color="#4338CA"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                >
                  Filter
                </Button>
              </Flex>

              {/* FILTER DROPDOWN MENU */}
              {showFilterMenu && (
                <Box
                  position="absolute"
                  right="0"
                  mt={2}
                  w="260px"
                  bg="white"
                  boxShadow="lg"
                  p={4}
                  borderRadius="md"
                  border="1px solid #e5e7eb"
                  zIndex={20}
                >
                  <Text fontWeight="600" mb={2}>
                    Filters
                  </Text>

                  <VStack spacing={3} align="stretch">
                    <Input
                      type="date"
                      size="sm"
                      value={formData.startDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />

                    <Input
                      type="date"
                      size="sm"
                      value={formData.endDate || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />

                    <Select
                      size="sm"
                      value={formData.type || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value="">Select Type</option>
                      <option value="invoice">Invoice</option>
                      <option value="service">Service</option>
                    </Select>

                    <Input
                      size="sm"
                      placeholder="Total Amount"
                      isReadOnly
                      value={services}
                    />

                    <Button
                      size="sm"
                      colorScheme="purple"
                      leftIcon={<FiSearch />}
                      onClick={() => {
                        handeleSearch();
                        setShowFilterMenu(false);
                      }}
                    >
                      Search
                    </Button>

                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => {
                        handleOpen();
                        setShowFilterMenu(false);
                      }}
                    >
                      Daily Report
                    </Button>
                  </VStack>
                </Box>
              )}
            </Box>
          </Flex>

          {/* =======================
            RECENT INVOICES TABLE
        ======================== */}
          <Card>
            <CardHeader borderBottomWidth="1px" borderColor="gray.200">
              <Text fontWeight="600">Recent Invoices</Text>
            </CardHeader>

            <CardBody px={0}>
              <Box>
                {/* WHEN RIGHT PANEL OPEN → SHOW COMPACT LIST */}
                {isRightPanelOpen ? (
                  <Table size="sm">
                    <Tbody>
                      {invoiceData.map((item) => (
                        <Tr
                          key={item.invoiceNo}
                          onClick={() => handleView(item.invoiceNo)}
                          style={{
                            cursor: "pointer",
                            background:
                              selectedInvoice?.invoiceNo === item.invoiceNo
                                ? "#eef2ff"
                                : "transparent",
                            borderLeft:
                              selectedInvoice?.invoiceNo === item.invoiceNo
                                ? "3px solid #4f46e5"
                                : "3px solid transparent",
                          }}
                        >
                          <Td>
                            <Text
                              fontWeight="600"
                              fontSize="sm"
                              color="blue.600"
                            >
                              {item.customerName}
                            </Text>

                            <Flex justify="space-between" mt={1}>
                              <Text fontSize="xs" color="gray.600">
                                {item.invoiceNo}
                              </Text>
                              <Text fontSize="sm" fontWeight="600">
                                ₹{item.amount}
                              </Text>
                            </Flex>

                            <Text fontSize="xs" color="gray.500">
                              {item.cre_date}
                            </Text>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                ) : (
                  /* FULL TABLE WHEN RIGHT PANEL CLOSED */
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Invoice No</Th>
                        <Th>Name</Th>
                        <Th>Mobile</Th>
                        <Th>Amount</Th>
                        <Th>Discount</Th>
                        <Th>Received</Th>
                        <Th>Date</Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {invoiceData.map((item) => (
                        <Tr key={item.invoiceNo}>
                          <Td
                            onClick={() => handleView(item.invoiceNo)}
                            style={{ cursor: "pointer", color: "#4f46e5" }}
                          >
                            {item.invoiceNo}
                          </Td>

                          <Td
                            onClick={() => handleView(item.invoiceNo)}
                            style={{
                              cursor: "pointer",
                              color: "#4f46e5",
                              fontWeight: 600,
                            }}
                          >
                            {item.customerName}
                          </Td>

                          <Td>{item.mobileNumber}</Td>
                          <Td>₹{item.amount}</Td>
                          <Td>{item.discount}</Td>
                          <Td>{item.total}</Td>
                          <Td>{item.cre_date}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Box>
            </CardBody>
          </Card>
        </Box>

        {/* ===========================
          RIGHT SIDE INVOICE PREVIEW
      ============================ */}
        {isRightPanelOpen && (
          <Box
            flex="1"
            height="100%"
            overflowY="auto"
            bg="white"
            p={6}
            borderLeft="1px solid #e5e7eb"
          >
            {/* TITLE BAR */}
            <Flex justify="space-between" align="center" mb={5}>
              <Heading size="md">Invoice #</Heading>
              <Button size="sm" onClick={() => setRightPanelOpen(false)}>
                Close
              </Button>
            </Flex>
            {showDailyReport ? (
              <Table variant="simple" size="sm" border="1px solid #e5e7eb">
                <Thead>
                  <Tr>
                    <Th>Metric</Th>
                    <Th isNumeric>Value</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>Number of Invoices</Td>
                    <Td isNumeric>{report?.invoiceCount}</Td>
                  </Tr>

                  <Tr>
                    <Td>Total Invoice Sale</Td>
                    <Td isNumeric>₹{report?.totalInvoiceSale}</Td>
                  </Tr>

                  <Tr>
                    <Td>Delivered Services</Td>
                    <Td isNumeric>{report?.deliveredCount}</Td>
                  </Tr>

                  <Tr>
                    <Td>Total Delivered Cost</Td>
                    <Td isNumeric>₹{report?.totalDeliveredCost}</Td>
                  </Tr>

                  <Tr>
                    <Td>Received Services</Td>
                    <Td isNumeric>{report?.receivedCount}</Td>
                  </Tr>

                  <Tr>
                    <Td>Today's Total Sale</Td>
                    <Td isNumeric>₹{report?.todayTotalSale}</Td>
                  </Tr>
                </Tbody>
                <Tfoot>
                  <Tr bg="gray.100">
                    <Th colSpan={3}></Th>
                    <Th fontWeight="700">₹{sumAmount}</Th>
                    <Th></Th>
                    <Th></Th>
                    <Th></Th>
                  </Tr>
                </Tfoot>
              </Table>
            ) : (
              <>
                {/* ACTION BUTTONS */}
                <Flex gap={3} mb={6}>
                  <Button size="sm" colorScheme="blue">
                    Edit
                  </Button>
                  <Button size="sm" colorScheme="green">
                    Share
                  </Button>
                  <Button size="sm" colorScheme="purple">
                    PDF/Print
                  </Button>
                  <Button size="sm" colorScheme="orange">
                    Record Payment
                  </Button>
                  <Button size="sm" colorScheme="red" onClick={handleDelete}>
                    Delete
                  </Button>
                </Flex>

                {/* CUSTOMER DETAILS */}
                <Heading size="sm" mb={2}>
                  Customer
                </Heading>
                <Text>{selectedInvoice.customerName}</Text>
                <Text>{selectedInvoice.mobile}</Text>

                {/* PRODUCT TABLE */}
                <Box mt={5}>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Product</Th>
                        <Th>Qty</Th>
                        <Th>Rate</Th>
                        <Th>Amount</Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {invoiceItems.map((item, index) => (
                        <Tr key={index}>
                          <Td>{item.product_name}</Td>
                          <Td>{item.quantity}</Td>
                          <Td>{formatCurrency(item.rate)}</Td>
                          <Td>{formatCurrency(item.amount)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>

                {/* TOTALS */}
                <Flex direction="column" align="flex-end" mt={6}>
                  <Flex justify="space-between" width="260px">
                    <Text>Subtotal:</Text>
                    <Text>{formatCurrency(subtotal)}</Text>
                  </Flex>

                  <Flex justify="space-between" width="260px">
                    <Text>Discount:</Text>
                    <Text>- {formatCurrency(invoiceDiscount)}</Text>
                  </Flex>

                  <Box
                    borderTop="2px solid #cdd1f5"
                    width="260px"
                    mt={2}
                    pt={2}
                  >
                    <Flex justify="space-between" fontWeight="700">
                      <Text>Total:</Text>
                      <Text>{formatCurrency(invoiceTotal)}</Text>
                    </Flex>
                  </Box>
                </Flex>
              </>
            )}
          </Box>
        )}
      </Flex>
    </>
  );
};

export default Report;
