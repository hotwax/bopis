import store from "@/store"

const handleParameterMatching = (orderVal: any, parameterVal: any, operation?: string) => {
  // considering params will always be an Array for ORing and ANDing
  if (operation === 'OR') {
    return parameterVal.some((param: any) => orderVal === param)
  } else if (operation === 'AND') {
    return parameterVal.every((param: any) => orderVal === param)
  } else if (operation === 'NOT') {
    if(parameterVal === '*') {
      if(!orderVal) {
        return true;
      }
      return false;
    }
    if(Array.isArray(parameterVal)) return !parameterVal.some((param: any) => param === orderVal)
    return orderVal !== parameterVal
  } else if (!operation) {
    return orderVal === parameterVal
  }
}

const getOrderCategory = (shipGroup: any) => {
  // Determine category based on shipmentStatusId
  let category = '';
  if (shipGroup.shipmentStatusId === 'SHIPMENT_PACKED') {
    category = 'Packed';
  } else if (shipGroup.shipmentStatusId === 'SHIPMENT_SHIPPED') {
    category = 'Completed';
  } else if (shipGroup.shipmentStatusId === 'SHIPMENT_APPROVED' || (shipGroup.shipmentStatusId === null && shipGroup.parentFacilityTypeId !== 'VIRTUAL_FACILITY')) {
    category = 'Open';
  } else if (!shipGroup.shipmentStatusId || shipGroup.shipmentStatusId === 'SHIPMENT_INPUT') {
    category = '';
  }
  return category;
}

const isKit = (item: any) => {
  const product = store.getters['product/getProduct'](item.productId);
  return product && product.productTypeId === 'MARKETING_PKG_PICK';
}

const removeKitComponents = (items: any) => {
  const kitItemSeqIds = new Set();
  const itemsWithoutKitComponents = [] as any;

  items.forEach((item:any) => {
    if (item.productTypeId === "MARKETING_PKG_PICK") {
      kitItemSeqIds.add(item.orderItemSeqId);
    }
  })
  
  //In current implementation kit product and component product will have the same orderItemSeqId
  items.forEach((item: any) => {
    const alreadyExists = itemsWithoutKitComponents.some(
      (itm: any) => itm.orderItemSeqId === item.orderItemSeqId
    );

    if ((item.productTypeId === "MARKETING_PKG_PICK" || !kitItemSeqIds.has(item.orderItemSeqId)) && !alreadyExists) {
      itemsWithoutKitComponents.push(item);
    }
  });
  return itemsWithoutKitComponents;
}

const getOrderStatus = (order: any, shipGroup: any, orderRouteSegment: any, orderType: string) => {
  if(order.orderStatusId === "ORDER_COMPLETED" || orderType === "completed") {
    return shipGroup?.shipmentMethodTypeId === "STOREPICKUP" ? "Picked up" : "Completed"
  }

  if(orderRouteSegment?.length) {
    return orderRouteSegment[0]?.shipmentStatusId === "SHIPMENT_PACKED" ? "Ready for pickup" : orderRouteSegment[0]?.shipmentStatusId === "SHIPMENT_APPROVED" && order.pickers ? "Picking" : "Reserved"
  }

  return "Reserved"
}

export {
  getOrderCategory,
  getOrderStatus,
  isKit,
  removeKitComponents
}