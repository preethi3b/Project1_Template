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
  Thead,
  Tr,
  IconButton,
  useDisclosure,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  useColorModeValue,
  Stack,
  Card,
  useToast,
  Tooltip,
  Spinner,
  Text,
  HStack,
  Select,
} from "@chakra-ui/react";
import { FiPlus, FiEye, FiTrash, FiInfo } from "react-icons/fi";
import { useState, useEffect } from "react";
import axios from "axios";
import { showToast } from "../../utils/toast";
const Stock = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [stockItems, setStockItems] = useState([]);
  const toast = useToast();
  const [deleteItemId, setDeleteItemId] = useState(null);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isItemsOpen,
    onOpen: onItemsOpen,
    onClose: onItemsClose,
  } = useDisclosure();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsData, setDetailsData] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedStockId, setSelectedStockId] = useState([]);
  const [newItem, setNewItem] = useState({
    productId: "",
    name: "",
    purchase_rate: "",
    supplier_name: "",
    rate: "",
    qty: "",
    gst: "",
    addQty: "",
    bikeModel: "",
    color: "",
  });
  const [detailItem, setDetailItem] = useState({
    engineNo: "",
    batteryNo: "",
    pcbNo: "",
    chassisNo: "",
    chargerSerialNo: "",
    hsnNo: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchStockItems(currentPage);
  }, [currentPage]);

  const fetchStockItems = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/stock?page=${page}&limit=${itemsPerPage}`
      );
      setStockItems(response.data.data || response.data);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      showToast({
        title: "Error",
        description: "Failed to load stock items",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (id, name) => {
    try {
      setSelectedStock(name);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/stock/${id}/history`
      );
      setHistoryData(response.data);
      setIsHistoryOpen(true);
    } catch {
      showToast({
        title: "Error",
        description: "Failed to load stock history",
        status: "error",
      });
    }
  };
  const handleViewDetails = async (id, name) => {
    try {
      setSelectedStock(name);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/stock/${id}/details`
      );
      setDetailsData(response.data);
      setIsDetailsOpen(true);
    } catch (error) {
      showToast({
        title: "Error",
        description: "Failed to load stock details",
        status: "error",
      });
    }
  };
  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/stock/${id}`
      );
      showToast({
        title: "Success",
        description: response.data.message || "Item deleted successfully",
        status: "success",
      });
      fetchStockItems(currentPage);
    } catch (error) {
      showToast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete item",
        status: "error",
      });
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/stock_select/${id}`
      );
      const data = response.data;
      setNewItem({
        productId: data.product_id || "",
        name: data.product_name || "",
        purchase_rate: data.purchase_rate || "",
        supplier_name: data.supplier_name || "N/A",
        rate: data.rate || "",
        qty: data.quantity || "",
        gst: data.gst || "",
        addQty: "",
        bikeModel: data.bike_model || "",
        color: data.color || "",
      });
      setIsEditing(true);
      setEditingId(id);
      onOpen();
    } catch {
      showToast({
        title: "Error",
        description: "Failed to fetch item",
        status: "error",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (
        !newItem.productId ||
        !newItem.name ||
        !newItem.rate ||
        !newItem.qty ||
        !newItem.purchase_rate ||
        !newItem.supplier_name
      ) {
        throw new Error("Please fill all required fields");
      }

      const itemToSend = {
        ...newItem,
        purchase_rate: parseFloat(newItem.purchase_rate),
        supplier_name: newItem.supplier_name,
        rate: parseFloat(newItem.rate),
        gst: newItem.gst ? parseFloat(newItem.gst) : 0,
        qty: parseInt(newItem.qty),
        addQty: parseInt(newItem.addQty) || 0,
        bikeModel: newItem.bikeModel,
        color: newItem.color,
      };

      if (isEditing) {
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/stock/${editingId}`,
          itemToSend
        );
        showToast({
          title: "Updated",
          description: "Stock updated successfully",
          status: "success",
        });
      } else {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/stock`,
          itemToSend
        );
        showToast({
          title: "Added",
          description: "New stock item added",
          status: "success",
        });
      }

      onClose();
      resetForm();
      fetchStockItems(currentPage);
    } catch (error) {
      showToast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        status: "error",
      });
    }
  };
  const handleOpenItems = (sid, name) => {
    setSelectedStockId(sid);
    setSelectedStock(name);
    setDetailItem({
      engineNo: "",
      batteryNo: "",
      pcbNo: "",
      chassisNo: "",
      chargerSerialNo: "",
      hsnNo: "",
    });
    onItemsOpen();
  };

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setDetailItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = async () => {
    const emptyField = Object.values(detailItem).some((val) => !val);
    if (emptyField) {
      showToast({
        title: "All fields are required",
        description: "Please fill all required fields.",
        status: "error",
      });
      return;
    }
    try {
      const payload = {
        stock_id: selectedStockId,
        engine_no: detailItem.engineNo,
        battery_no: detailItem.batteryNo,
        pcb_no: detailItem.pcbNo,
        chassis_no: detailItem.chassisNo,
        charger_serial_no: detailItem.chargerSerialNo,
        hsn_no: detailItem.hsnNo,
      };

      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/stock_items`,
        payload
      );
      showToast({
        title: "Added",
        description: "Stock item details added successfully",
        status: "success",
      });

      onItemsClose();
    } catch (error) {
      showToast({
        title: "Error adding item details",
        description: error.response?.data?.message || error.message,
        status: "error",
      });
    }
  };

  const resetForm = () => {
    setNewItem({
      productId: "",
      name: "",
      purchase_rate: "",
      supplier_name: "",
      rate: "",
      qty: "",
      gst: "",
      addQty: "",
    });
    setIsEditing(false);
    setEditingId(null);
  };
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_BASE_URL}/supplier`)
      .then((res) => {
        const supplierNames = (res.data.data || []).map((s) => s.supplier_name);
        setSuppliers(supplierNames);
      })
      .catch((err) => console.error("Supplier fetch error", err));
  }, []);

  return (
    <>
      {loading && (
        <Box className="loading-overlay">
          <Spinner size="xl" color="#625DF0" thickness="4px" mb={2} />
          <Text className="loading-text">
            Retrieving records, please wait...
          </Text>
        </Box>
      )}

      <Box overflow="hidden">
        {/* Page Header */}
        <Flex className="page-header">
          <Text className="page-title">Stock Details</Text>
          <Button
            className="btn-primary"
            size="sm"
            onClick={() => {
              resetForm();
              onOpen();
            }}
            leftIcon={<FiPlus />}
          >
            Add Stock
          </Button>
        </Flex>

        <Card className="table-card">
          <Box className="table-scroll">
            <Table className="table" variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>Product Name</Th>
                  <Th>Purchase Rate (₹)</Th>
                  <Th>Rate (₹)</Th>
                  <Th>Total Qty</Th>
                  <Th>Available Qty</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {stockItems.map((item) => (
                  <Tr key={item.sid}>
                    <Td
                      className="clickable-id"
                      onClick={() => handleEdit(item.sid)}
                      sx={{
                        cursor: "pointer !important",
                        color: "#625DF0 !important",
                        // textDecoration: "underline !important",
                      }}
                    >
                      {item.id}
                    </Td>
                    <Td>{item.name}</Td>
                    <Td>₹{item.purchase_rate}</Td>
                    <Td>₹{item.rate}</Td>
                    <Td>{item.quantity}</Td>
                    <Td>{item.availableQty}</Td>

                    <Td>
                      <Flex>
                        <Tooltip label="Delete Item" bg="#625DF0" color="white">
                          <IconButton
                            icon={<FiTrash />}
                            aria-label="Delete"
                            size="sm"
                            className="table-action-btn delete"
                            onClick={() => {
                              setDeleteItemId(item.sid);
                              onDeleteOpen();
                            }}
                          />
                        </Tooltip>
                        <Tooltip
                          label="View History"
                          bg="#625DF0"
                          color="white"
                        >
                          <IconButton
                            icon={<FiEye />}
                            aria-label="View History"
                            size="sm"
                            className="table-action-btn view"
                            // onClick={() =>
                            //   handleViewHistory(item.sid, item.name)
                            // }
                            onClick={() =>
                              handleViewDetails(item.sid, item.name)
                            }
                          />
                        </Tooltip>
                        <Tooltip
                          label="Add item details"
                          bg="#625DF0"
                          color="white"
                        >
                          <IconButton
                            icon={<FiPlus />}
                            aria-label="Add Item"
                            className="table-action-btn view"
                            size="sm"
                            onClick={() => handleOpenItems(item.sid, item.name)}
                          />
                        </Tooltip>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Flex className="pagination-footer">
            <Text className="pagination-text">
              Showing {stockItems.length} items
            </Text>
            <HStack spacing={2}>
              <Button
                size="xs"
                className="pagination-btn"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                isDisabled={currentPage === 1}
              >
                Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  size="xs"
                  className={`pagination-btn ${
                    currentPage === i + 1 ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}

              <Button
                size="xs"
                className="pagination-btn"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Card>

        {/* Add / Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
          <ModalOverlay />
          <ModalContent className="modal-box">
            <ModalHeader className="modal-header">
              {isEditing ? "Edit Stock Item" : "Add New Stock Item"}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody className="modal-body">
              <Stack spacing={3} className="modal-form">
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Product ID
                  </FormLabel>
                  <Input
                    name="productId"
                    value={newItem.productId}
                    onChange={handleChange}
                    placeholder="Enter product ID"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Product Name
                  </FormLabel>
                  <Input
                    name="name"
                    value={newItem.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Purchase Rate (₹)
                  </FormLabel>
                  <Input
                    type="number"
                    name="purchase_rate"
                    value={newItem.purchase_rate}
                    onChange={handleChange}
                    placeholder="Enter rate"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Supplier Name
                  </FormLabel>
                  <Select
                    name="supplier_name"
                    value={newItem.supplier_name}
                    onChange={handleChange}
                    placeholder="Select supplier"
                    isDisabled={isEditing}
                    size="sm"
                    h="1.5rem"
                    fontFamily="Inter, sans-serif"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  >
                    {suppliers?.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Rate (₹)
                  </FormLabel>
                  <Input
                    type="number"
                    name="rate"
                    value={newItem.rate}
                    onChange={handleChange}
                    placeholder="Enter rate"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    Current Quantity
                  </FormLabel>
                  <Input
                    type="number"
                    name="qty"
                    value={newItem.qty}
                    onChange={handleChange}
                    placeholder="Enter total quantity"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
                {isEditing && (
                  <FormControl>
                    <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                      Add Quantity
                    </FormLabel>
                    <Input
                      type="number"
                      name="addQty"
                      value={newItem.addQty}
                      onChange={handleChange}
                      placeholder="Enter quantity to add"
                      fontFamily="Inter, sans-serif"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{
                        borderColor: "#625DF0",
                      }}
                      _focus={{
                        borderColor: "#625DF0",
                        boxShadow: "0 0 0 1px #625DF0",
                      }}
                    />
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                    GST
                  </FormLabel>
                  <Input
                    type="number"
                    name="gst"
                    value={newItem.gst}
                    onChange={handleChange}
                    placeholder="Enter GST"
                    isDisabled={isEditing}
                    fontFamily="Inter, sans-serif"
                    borderRadius="lg"
                    borderColor="gray.300"
                    _hover={{
                      borderColor: "#625DF0",
                    }}
                    _focus={{
                      borderColor: "#625DF0",
                      boxShadow: "0 0 0 1px #625DF0",
                    }}
                  />
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter className="modal-footer">
              <Button
                variant="ghost"
                className="btn-cancel"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button className="btn-primary" size="sm" onClick={handleSave}>
                {isEditing ? "Update" : "Save"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isItemsOpen} onClose={onItemsClose} size="md" isCentered>
          <ModalOverlay />
          <ModalContent className="modal-box">
            <ModalHeader className="modal-header">
              Add Stock Item Details – {selectedStock}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody className="modal-body">
              <Stack spacing={3} className="modal-form">
                {[
                  { label: "Engine No", name: "engineNo" },
                  { label: "Battery No", name: "batteryNo" },
                  { label: "PCB No", name: "pcbNo" },
                  { label: "Chassis No", name: "chassisNo" },
                  { label: "Charger Serial No", name: "chargerSerialNo" },
                  { label: "HSN Number", name: "hsnNo" },
                ].map((field) => (
                  <FormControl key={field.name} mb={2}>
                    <FormLabel fontFamily="Inter, sans-serif" fontWeight="500">
                      {field.label}
                    </FormLabel>
                    <Input
                      name={field.name}
                      value={detailItem[field.name]}
                      onChange={handleDetailChange}
                      placeholder={`Enter ${field.label}`}
                      fontFamily="Inter, sans-serif"
                      borderRadius="lg"
                      borderColor="gray.300"
                      _hover={{
                        borderColor: "#625DF0",
                      }}
                      _focus={{
                        borderColor: "#625DF0",
                        boxShadow: "0 0 0 1px #625DF0",
                      }}
                    />
                  </FormControl>
                ))}
              </Stack>
            </ModalBody>
            <ModalFooter className="modal-footer">
              <Button
                variant="ghost"
                className="btn-cancel"
                size="sm"
                onClick={onItemsClose}
              >
                Cancel
              </Button>
              <Button className="btn-primary" size="sm" onClick={handleAddItem}>
                Add
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Modal */}
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} isCentered>
          <ModalOverlay />
          <ModalContent className="modal-box">
            <ModalHeader className="modal-header">Confirm Deletion</ModalHeader>
            <ModalCloseButton />
            <ModalBody className="modal-body">
              <Text>Are you sure you want to delete this stock item?</Text>
            </ModalBody>
            <ModalFooter className="modal-footer">
              <Button
                variant="ghost"
                className="btn-cancel"
                onClick={onDeleteClose}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                className="btn-danger"
                size="sm"
                onClick={() => {
                  handleDelete(deleteItemId);
                  onDeleteClose();
                }}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* History Modal */}
        <Modal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          size="lg"
          isCentered
        >
          <ModalOverlay />
          <ModalContent className="modal-box">
            <ModalHeader className="modal-header">
              Stock History - {selectedStock}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody className="modal-body">
              {historyData.length > 0 ? (
                <Box className="table-card">
                  <Box className="table-scroll">
                    <Table className="table">
                      <Thead>
                        <Tr>
                          <Th>Date & Time</Th>
                          <Th>Old Qty</Th>
                          <Th>Added Qty</Th>
                          <Th>New Qty</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {historyData.map((record, index) => (
                          <Tr key={index}>
                            <Td>
                              {new Date(record.updated_at).toLocaleString()}
                            </Td>
                            <Td>{record.old_qty}</Td>
                            <Td className="added">+{record.added_qty}</Td>
                            <Td>{record.new_qty}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Box>
              ) : (
                <Text className="empty-text">
                  No history found for this stock item.
                </Text>
              )}
            </ModalBody>
            <ModalFooter className="modal-footer">
              <Button
                className="btn-primary"
                size="sm"
                onClick={() => setIsHistoryOpen(false)}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          size="2xl"
          isCentered
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent className="modal-box" maxH="80vh">
            <ModalHeader className="modal-header">
              Stock Details - {selectedStock}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody className="modal-body">
              {detailsData.length > 0 ? (
                <Card className="table-card">
                  <Box className="table-scroll" maxH="60vh" overflowY="auto">
                    <Table className="table" variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Date & Time</Th>
                          <Th>Engine No</Th>
                          <Th>Chassis No</Th>
                          <Th>Battery No</Th>
                          <Th>PCB No</Th>
                          <Th>Charger Serial</Th>
                          <Th>HSN No</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {detailsData.map((record, index) => (
                          <Tr key={index}>
                            <Td>
                              {record.create_date
                                ? new Date(record.create_date).toLocaleString()
                                : "-"}
                            </Td>
                            <Td>{record.engine_no || "-"}</Td>
                            <Td>{record.chassis_no || "-"}</Td>
                            <Td>{record.battery_no || "-"}</Td>
                            <Td>{record.pcb_no || "-"}</Td>
                            <Td>{record.charger_serial_no || "-"}</Td>
                            <Td>{record.hsn_no || "-"}</Td>
                            <Td
                              color={record.qty === 1 ? "green.600" : "red.600"}
                              fontWeight="600"
                            >
                              {record.qty === 1 ? "Available" : "Sold"}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                </Card>
              ) : (
                <Text textAlign="center" py={4} color="gray.500">
                  No stock items found for this stock.
                </Text>
              )}
            </ModalBody>
            <ModalFooter className="modal-footer">
              <Button
                variant="ghost"
                className="btn-cancel"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    </>
  );
};

export default Stock;
