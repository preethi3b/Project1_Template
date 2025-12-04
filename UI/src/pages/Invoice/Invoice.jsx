import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Flex,
  Heading,
  useToast,
  Spinner,
  Text,
  Card,
  useColorModeValue,
  IconButton,
  Tooltip,
  InputGroup,
  InputLeftElement,
  Select,
  Divider,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import axios from "axios";
import { showToast } from "../../utils/toast";
const Invoice = () => {
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [discount, setDiscount] = useState("");
  const [rows, setRows] = useState([]);
  const headerColor = useColorModeValue("blue.600", "blue.300");
  const toast = useToast();
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const tableBg = useColorModeValue("white", "gray.800");

  const [productList, setProductList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState("select");
  const totalAmount = rows.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const netAmount = totalAmount - (Number(discount) || 0);

  useEffect(() => {
    handleGetInvoiceNo();
    handleFetchProducts();
  }, []);

  const handleFetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/products/all`
      );
      const normalized = (res.data || []).map((p) => ({
        ...p,
        rate: Number(p.rate) || 0,
      }));
      setProductList(normalized);
      setFilteredList(normalized);
    } catch {
      showToast({
        title: "Error fetching products",
        description: "Check server connection.",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetInvoiceNo = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/invoiceNo/`
      );
      setInvoiceNo(res.data.invoiceNo);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (value) => {
    setQuery(value);
    setIsOpen(true);
    if (!value.trim()) {
      setFilteredList(productList);
      return;
    }
    const filtered = productList.filter((p) =>
      p.productName.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredList(filtered);
  };

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setQuery(p.productName);
    setIsOpen(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      showToast({ title: "Select a product", status: "warning" });
      return;
    }

    const rate = Number(selectedProduct.rate || 0);
    const qty = Number(quantity || 0);
    if (qty <= 0) {
      showToast({ title: "Enter a valid quantity", status: "warning" });
      return;
    }

    const amount = rate * qty;
    const already = rows.find((r) => r.productId === selectedProduct.productId);
    if (already) {
      showToast({ title: "Product already added", status: "info" });
      return;
    }

    const newRow = {
      productId: selectedProduct.productId,
      productName: selectedProduct.productName,
      rate: rate,
      quantity: qty,
      amount: amount,
    };
    setRows([...rows, newRow]);
    setSelectedProduct(null);
    setQuery("");
    setQuantity(1);
  };

  const handleRemove = (id) => {
    setRows(rows.filter((r) => r.productId !== id));
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      showToast({ title: "Add at least one product", status: "warning" });
      return;
    }

    const payload = {
      customerName,
      mobileNumber,
      total: totalAmount,
      discount: discount || 0,
      items: rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        rate: r.rate,
        quantity: r.quantity,
        amount: r.amount,
      })),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: "Invoice Saved!", status: "success" });
        printReceipt({
          ...payload,
          billNo: data.invoiceId,
          date: new Date().toLocaleDateString(),
          billTotal: netAmount,
        });
        setRows([]);
        setCustomerName("");
        setMobileNumber("");
        setDiscount("");
        handleGetInvoiceNo();
      } else {
        showToast({
          title: "Save failed",
          description: data.error,
          status: "error",
        });
      }
    } catch (err) {
      showToast({ title: "Error", description: err.message, status: "error" });
    }
  };
  const savedconfig = localStorage.getItem("companyConfig");
  const parsed = savedconfig ? JSON.parse(savedconfig) : null;
  const config = parsed?.value || parsed;
  const companyName = config?.name || "Company Name";
  const place = config?.address || "";
  const phoneNumber = config?.phone || "";
  const printReceipt = (data) => {
    const {
      customerName,
      mobileNumber,
      items,
      billTotal,
      total,
      discount,
      billNo,
      date,
    } = data;
    const html = `
      <html><head><style>
      body{font-family:monospace;font-size:13px;margin:0;padding:0}
      table{width:100%;border-collapse:collapse}
      td{padding:2px}
      .line{border-top:1px solid #000;margin:6px 0}
      .conditions{font-size:12px;white-space:pre-wrap;line-height:1.4}
       .row {
          display: flex;
          justify-content: space-between;
        }
      </style></head><body>
      <div style="text-align:center;font-weight:bold">${companyName} </div>
      <div style="text-align:center">${place}</div>
      <div style="text-align:center">${phoneNumber}</div>
      <div class="line"></div>
       <div class="row">
          <div><b>Bill No:</b> ${billNo}</div>
          <div><b>Date:</b> ${date}</div>
        </div>
        <div class="row">
          <div><b>Customer:</b> ${customerName}</div>
          <div><b>Mobile No:</b> ${phoneNumber}</div>
        </div>
      <div class="line"></div>
      <table><tr><td><b>S.No</b></td><td><b>Item</b></td><td><b>Rate</b></td><td><b>Qty</b></td><td><b>Amt</b></td></tr>
      ${items
        .map(
          (i, index) =>
            `<tr><td>${index + 1}</td><td>${i.productName}</td><td>${Number(
              i.rate
            ).toFixed(2)}</td><td>${i.quantity}</td><td>${Number(
              i.amount
            ).toFixed(2)}</td></tr>`
        )
        .join("")}
      </table>
      <div class="line"></div>
      <div style="text-align:right">Total: ₹${Number(total).toFixed(2)}</div>
      <div style="text-align:right">Discount: ₹${Number(discount || 0).toFixed(
        2
      )}</div>
      <div style="text-align:right;font-weight:bold">Net: ₹${Number(
        billTotal
      ).toFixed(2)}</div>
      <div class="line"></div>
      <div class="conditions">
        <b>நிபந்தனைகள்:</b><br>
        ❖ Sim Card, Memory Card, Battery போன்ற வாடிக்கையாளர்களின் சொந்த பொருட்களை கவனமாக கொண்டு செல்ல வேண்டும்.<br><br>
        ❖ தவறான கொடுத்தவுடன் மீண்டும் சென்றுவிட்டால் எந்தவொரு நிலுவை பணமும் திருப்பி வழங்கப்படமாட்டாது.<br>
        &nbsp;&nbsp;சரிசெய்து கொடுக்க முடியாதபட்சத்தில் பட்டணங்களுக்கு அனுப்பி சரிசெய்யப்படும்.<br>
        &nbsp;&nbsp;காலநிலையால் செல்போன் சிக்கல் ஏற்பட்டால் பொறுப்பேற்க முடியாது.<br><br>
        ❖ மாறிய பொருள்களுக்கு மற்றும் தாமதமான பணியாளர்களுக்கு சிறிய தாமதம் ஏற்படலாம்.<br><br>
        ❖ பில் கொடுத்த பிறகே மட்டும் செல்போன் திரும்பப் பெறப்படும்.<br><br>
        ❖ Display, No Network IC, Touch Problem, Water Problem – <b>NO WARRANTY, NO CARENTY</b><br><br>
        <><b>Customer Signature</b> ________________________ 
        <span style="float:right;">For. ${companyName} </span></div>
      </div>
      <div class="line"></div>
      <div style="text-align:center">Thank you! Visit Again</div>
      </body></html>
    `;
    const w = window.open("", "PRINT", "height=600,width=800");
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  return (
    <Box overflow="hidden">
      <Flex
        className="page-header"
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        mb={8}
        wrap="wrap"
        gap={3}
        w="100%"
        direction={{ base: "column", md: "row" }}
      >
        {/* Title */}
        <Text className="page-title" flex="0 0 auto" mb={{ base: 2, md: 0 }}>
          Create Invoice
        </Text>

        {/* Inputs Group */}
        <Flex
          className="customer-info-group"
          gap={3}
          align={{ base: "stretch", md: "center" }}
          justify="flex-end"
          flex="1"
          flexWrap="wrap"
          w="100%"
        >
          <Input
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            size="sm"
            className="input-primary customer-input"
            flex={{ base: "1 0 100%", md: "0 0 25%" }}
            minW={{ base: "100%", md: "160px" }}
          />

          <Input
            placeholder="Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            size="sm"
            type="number"
            className="input-primary customer-input"
            flex={{ base: "1 0 100%", md: "0 0 20%" }}
            minW={{ base: "100%", md: "140px" }}
          />

          <Select
            size="sm"
            className="input-primary payment-select"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            flex={{ base: "1 0 100%", md: "0 0 15%" }}
            minW={{ base: "100%", md: "120px" }}
          >
            <option value="Cash">Cash</option>
            <option value="Gpay">GPay</option>
          </Select>
        </Flex>
      </Flex>

      {/* Table Section */}
      <Card
        className="table-card"
        borderWidth="1px"
        borderColor={borderColor}
        shadow="sm"
        bg={tableBg}
      >
        <Box className="table-scroll" minH="300px" overflowX="auto">
          <Table className="table" variant="simple" size="sm" minW="650px">
            <Thead className="table-header">
              <Tr>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Rate</Th>
                <Th className="text-right">Amount</Th>
                <Th textAlign="center">Action</Th>
              </Tr>

              {/* Add Product Row */}
              <Tr>
                <Td colSpan="6">
                  <Flex
                    className="invoice-input-row"
                    gap={3}
                    align="center"
                    w="100%"
                    flexWrap={{ base: "wrap", md: "nowrap" }}
                  >
                    <Box
                      position="relative"
                      flex="1"
                      minW={{ base: "100%", md: "80%" }}
                      className="search-wrapper"
                    >
                      <InputGroup>
                        <InputLeftElement className="search-icon-wrapper">
                          <SearchIcon
                            className="search-icon"
                            color="var(--color-brand-primary)"
                            boxSize={3.5}
                            mb={2.5}
                          />
                        </InputLeftElement>

                        <Input
                          placeholder="Search or select product..."
                          value={query}
                          onChange={(e) => handleSearch(e.target.value)}
                          onFocus={() => setIsOpen(true)}
                          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                          size="sm"
                          className="input-primary search-input"
                        />
                      </InputGroup>

                      {isOpen && (
                        <Box
                          className="dropdown-box"
                          position="absolute"
                          top="100%"
                          left="0"
                          right="0"
                          zIndex="1000"
                          mt="1"
                          bg="white"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          boxShadow="lg"
                          maxH="200px"
                          overflowY="auto"
                        >
                          {isLoading ? (
                            <Flex align="center" justify="center" p={3}>
                              <Spinner size="sm" mr={2} />
                              <Text>Loading...</Text>
                            </Flex>
                          ) : filteredList.length > 0 ? (
                            filteredList.map((p) => (
                              <Flex
                                key={p.productId}
                                className="dropdown-item"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectProduct(p);
                                }}
                                p={2}
                                _hover={{ bg: "gray.50" }}
                                cursor="pointer"
                                borderBottom="1px solid"
                                borderColor="gray.100"
                                justify="space-between"
                              >
                                <Text className="dropdown-name" flex="1">
                                  {p.productName}
                                </Text>
                                <Text
                                  className="dropdown-rate"
                                  fontWeight="bold"
                                >
                                  ₹{Number(p.rate).toFixed(2)}
                                </Text>
                              </Flex>
                            ))
                          ) : (
                            <Text
                              className="dropdown-empty"
                              p={3}
                              textAlign="center"
                              color="gray.500"
                            >
                              No matching products
                            </Text>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Quantity */}
                    <Input
                      flex={{ base: "1 0 48%", md: "0 0 10%" }}
                      size="sm"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="input-primary input-small"
                      placeholder="Qty"
                    />

                    {/* Add Button */}
                    <Button
                      flex={{ base: "1 0 48%", md: "0 0 8%" }}
                      leftIcon={<FiPlus />}
                      className="btn-primary"
                      size="sm"
                      px={2}
                      onClick={handleAddProduct}
                      isDisabled={!selectedProduct}
                    >
                      Add
                    </Button>
                  </Flex>
                </Td>
              </Tr>
            </Thead>

            <Tbody>
              {rows.length > 0 ? (
                rows.map((row, i) => (
                  <Tr key={i}>
                    <Td>{row.productName}</Td>
                    <Td className="text-right">{row.quantity}</Td>
                    <Td className="text-right">
                      {Number(row.rate).toFixed(2)}
                    </Td>
                    <Td className="text-right">
                      {Number(row.amount).toFixed(2)}
                    </Td>
                    <Td textAlign="center">
                      <Flex gap="6px">
                        <Tooltip label="Remove Item" bg="#625DF0" color="white">
                          <IconButton
                            icon={<FiTrash2 />}
                            aria-label="Remove"
                            size="sm"
                            className="table-action-btn delete"
                            onClick={() => handleRemove(row.productId)}
                          />
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan="6" textAlign="center" color="gray.500" py={6}>
                    No products added
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      </Card>

      <Flex justify="flex-end" mt={8}>
        <Box
          bg="white"
          border="1px solid #E5E7EB"
          borderRadius="xl"
          boxShadow="0 -2px 10px rgba(98, 93, 240, 0.08)"
          w={{ base: "100%", md: "360px" }}
          p={5}
          className="rounded-xl bg-[#fafbff] shadow-sm"
        >
          {/* Sub Total */}
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="semibold" color="gray.700">
              Total
            </Text>
            <Text className="footer-value">
              ₹{Number(totalAmount || 0).toFixed(2)}
            </Text>
          </Flex>

          {/* Discount */}
          <Flex justify="space-between" align="center" mb={3}>
            <Text color="gray.600">Discount</Text>
            <Flex align="center" gap={2}>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                width="70px"
                height="28px"
                fontSize="sm"
              />
              <Text color="gray.500">%</Text>
              <Text color="gray.700">₹{Number(discount || 0).toFixed(2)}</Text>
            </Flex>
          </Flex>

          <Divider my={3} />

          {/* Total */}
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="semibold" color="gray.700">
              Net Amount ( ₹ )
            </Text>
            <Text fontSize="md" fontWeight="bold" color="#012AF6">
              ₹{Number(netAmount).toFixed(2)}
            </Text>
          </Flex>

          {/* Button */}
          <Button
            className="btn-primary"
            size="sm"
            onClick={handleSave}
            isDisabled={rows.length === 0}
          >
            Print Invoice
          </Button>
        </Box>
      </Flex>
    </Box>
  );
};

export default Invoice;
