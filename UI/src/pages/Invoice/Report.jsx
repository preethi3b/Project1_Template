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
          <Text className="loading-text">
            Retrieving records, please wait...
          </Text>
        </Box>
      )}

      {/* MAIN LAYOUT */}
      <Box overflow="hidden" width="100%">
        <Flex
          align="stretch"
          direction={{ base: "column", md: "row" }} // 👈 Stack on mobile
          width="100%"
        >
          {/* LEFT SIDE */}
          <Box
            width={{ base: "100%", md: isRightPanelOpen ? "420px" : "100%" }}
            minWidth={{ base: "100%", md: isRightPanelOpen ? "420px" : "100%" }}
            height="100%"
            overflowY="auto"
            transition="all 0.3s ease"
            borderRight={{
              base: "none",
              md: isRightPanelOpen ? "1px solid #e5e7eb" : "none",
            }}
            className="page-left"
            p={{ base: 3, md: 0 }}
          >
            {/* HEADER */}
            <Flex
              className="page-header"
              direction={{ base: "column", sm: "row" }}
              justify="space-between"
              align={{ base: "flex-start", sm: "center" }}
              wrap="wrap"
              gap={2}
            >
              <Text className="page-title">Report</Text>

              <Box
                position="relative"
                className="header-actions"
                width={{ base: "100%", sm: "auto" }}
              >
                <Flex
                  gap={2}
                  wrap="wrap"
                  justify={{ base: "flex-start", sm: "flex-end" }}
                >
                  {/* DOWNLOAD MENU */}
                  <Menu>
                    <MenuButton
                      as={Button}
                      leftIcon={<FiDownload />}
                      size="sm"
                      className="btn-secondary"
                      width={{ base: "100%", sm: "auto" }}
                    >
                      Download
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={handleDownloadPDF}>
                        PDF Format
                      </MenuItem>
                      <MenuItem onClick={handleDownloadXLSX}>
                        XLSX Format
                      </MenuItem>
                    </MenuList>
                  </Menu>

                  {/* FILTER BUTTON */}
                  <Button
                    leftIcon={<FiFilter size={18} />}
                    size="sm"
                    className="btn-primary"
                    width={{ base: "100%", sm: "auto" }}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    Filter
                  </Button>
                </Flex>

                {/* FILTER DROPDOWN */}
                {showFilterMenu && (
                  <Box
                    className="filter-menu"
                    position={{ base: "fixed", sm: "absolute" }}
                    right={{ base: "50%", sm: "0" }}
                    top={{ base: "50%", sm: "2.8rem" }}
                    transform={{ base: "translate(50%, -50%)", sm: "none" }}
                    zIndex="1000"
                    bgColor="white"
                    p={4}
                    borderRadius="md"
                    boxShadow="0 8px 24px rgba(0,0,0,0.2)"
                    width={{ base: "90%", sm: "260px" }}
                  >
                    <Text className="filter-title" mb={2}>
                      Filters
                    </Text>

                    <VStack spacing={3} align="stretch">
                      <Input
                        type="date"
                        size="sm"
                        value={formData.startDate || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
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
                        className="btn-primary"
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
                        className="btn-secondary"
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

            {/* RECENT INVOICES TABLE */}
            <Card className="table-card" mt={3}>
              <CardHeader borderBottomWidth="1px" borderColor="gray.200">
                <Text className="table-title">Recent Invoices</Text>
              </CardHeader>

              <CardBody px={0}>
                <Box className="table-scroll" minH="300px" overflowX="auto">
                  {isRightPanelOpen ? (
                    <Table size="sm" className="table">
                      <Tbody>
                        {invoiceData.map((item) => (
                          <Tr
                            key={item.invoiceNo}
                            onClick={() => handleView(item.invoiceNo)}
                            style={{
                              cursor: "pointer",
                              backgroundColor:
                                selectedInvoice?.invoiceNo === item.invoiceNo
                                  ? "rgba(98, 93, 240, 0.08)"
                                  : "transparent",
                              borderLeft:
                                selectedInvoice?.invoiceNo === item.invoiceNo
                                  ? "3px solid #625DF0"
                                  : "3px solid transparent",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <Td>
                              <Text
                                color="#625DF0"
                                textDecoration="underline"
                                cursor="pointer"
                                _hover={{
                                  color: "#5148d8",
                                  textDecoration: "none",
                                }}
                              >
                                {item.customerName}
                              </Text>
                              <Flex justify="space-between" mt={1}>
                                <Text className="sub-id">{item.invoiceNo}</Text>
                                <Text className="amount">₹{item.amount}</Text>
                              </Flex>
                              <Text className="sub-date">{item.cre_date}</Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Table size="sm" className="table">
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
                          <Tr
                            key={item.invoiceNo}
                            onClick={() => handleView(item.invoiceNo)}
                            style={{
                              backgroundColor:
                                selectedInvoice?.invoiceNo === item.invoiceNo
                                  ? "rgba(98, 93, 240, 0.08)"
                                  : "transparent",
                              borderLeft:
                                selectedInvoice?.invoiceNo === item.invoiceNo
                                  ? "3px solid #625DF0"
                                  : "3px solid transparent",
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                          >
                            <Td>
                              <Text
                                color="#625DF0"
                                textDecoration="underline"
                                cursor="pointer"
                                _hover={{
                                  color: "#5148d8",
                                  textDecoration: "none",
                                }}
                              >
                                {item.invoiceNo}
                              </Text>
                            </Td>
                            <Td>
                              <Text
                                color="#625DF0"
                                textDecoration="underline"
                                cursor="pointer"
                                _hover={{
                                  color: "#5148d8",
                                  textDecoration: "none",
                                }}
                              >
                                {item.customerName}
                              </Text>
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

          {/* RIGHT PANEL */}
          {isRightPanelOpen && (
            <Box
              flex="1"
              height={{ base: "auto", md: "100%" }}
              overflowY="auto"
              bg="white"
              p={6}
              className="right-panel"
              sx={{ scrollBehavior: "smooth", alignSelf: "stretch" }}
              borderTop={{ base: "1px solid #e5e7eb", md: "none" }}
            >
              <Flex
                className="page-header"
                justify="space-between"
                align="center"
                mb={4}
                wrap="wrap"
              >
                <Text className="page-title">
                  Invoice #{selectedInvoice?.invoiceNo}
                </Text>
                <Button
                  size="sm"
                  className="btn-cancel"
                  onClick={() => setRightPanelOpen(false)}
                >
                  Close
                </Button>
              </Flex>

              {showDailyReport ? (
                <Table variant="simple" size="sm" className="table">
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
                </Table>
              ) : (
                <>
                  <Flex
                    gap={2}
                    mb={4}
                    flexWrap="wrap"
                    justify={{ base: "flex-start", md: "flex-start" }}
                  >
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: "#625DF0",
                        color: "#fff",
                        borderRadius: "8px",
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: "#E0E7FF",
                        color: "#4338CA",
                        borderRadius: "8px",
                      }}
                    >
                      Share
                    </Button>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: "#E0F2FE",
                        color: "#0369A1",
                        borderRadius: "8px",
                      }}
                    >
                      PDF/Print
                    </Button>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: "#E0F2FE",
                        color: "#0369A1",
                        borderRadius: "8px",
                      }}
                    >
                      Record Payment
                    </Button>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: "#F3F4F6",
                        color: "#333",
                        borderRadius: "8px",
                      }}
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  </Flex>

                  <Box>
                    <Heading size="sm" mb={2}>
                      Customer
                    </Heading>
                    <Text>{selectedInvoice.customerName}</Text>
                    <Text>{selectedInvoice.mobile}</Text>
                  </Box>

                  <Box mt={5} overflowX="auto">
                    <Table size="sm" className="table" minW="480px">
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

                  <Flex
                    direction="column"
                    align={{ base: "stretch", sm: "flex-end" }}
                    mt={6}
                    className="total-summary"
                    width="100%"
                    px={{ base: 2, sm: 0 }}
                  >
                    <Flex
                      justify="space-between"
                      width={{ base: "100%", sm: "260px" }}
                      mb={1}
                    >
                      <Text fontSize={{ base: "sm", sm: "md" }}>Subtotal:</Text>
                      <Text fontSize={{ base: "sm", sm: "md" }}>
                        {formatCurrency(subtotal)}
                      </Text>
                    </Flex>

                    <Flex
                      justify="space-between"
                      width={{ base: "100%", sm: "260px" }}
                      mb={1}
                    >
                      <Text fontSize={{ base: "sm", sm: "md" }}>Discount:</Text>
                      <Text fontSize={{ base: "sm", sm: "md" }}>
                        - {formatCurrency(invoiceDiscount)}
                      </Text>
                    </Flex>

                    <Box
                      borderTop="2px solid #cdd1f5"
                      width={{ base: "100%", sm: "260px" }}
                      mt={2}
                      pt={2}
                    >
                      <Flex justify="space-between" fontWeight="700">
                        <Text fontSize={{ base: "sm", sm: "md" }}>Total:</Text>
                        <Text fontSize={{ base: "sm", sm: "md" }}>
                          {formatCurrency(invoiceTotal)}
                        </Text>
                      </Flex>
                    </Box>
                  </Flex>
                </>
              )}
            </Box>
          )}
        </Flex>
      </Box>
    </>
  );
};

export default Report;
