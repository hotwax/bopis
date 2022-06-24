const prepareOISGIRQuery = (params: any) => {
  const viewSize = params.viewSize ? params.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = params.viewIndex ? params.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "sort": "orderDate desc",
        "group": true,
        "group.field": "orderId",
        "group.limit": 1000,
        "group.ngroups": true,
        "q.op": "AND",
        "start": viewIndex * viewSize
      },
      "query":"(*:*)",
      "filter": ["docType: OISGIR"]
    }
  } as any

  if (params.queryString) {
    payload.json.query = `(*${params.queryString}*)`
    payload.json.params['qf'] = "productId productName virtualProductName orderId productSku customerId customerName search_orderIdentifications goodIdentifications"
    payload.json.params['defType'] = "edismax"
  }

  if (!params.shippingOrdersStatus) {
    payload.json.filter.push("shipmentMethodTypeId: STOREPICKUP")
  }

  if (params.orderTypeId) {
    payload.json.filter.push(`orderTypeId: ${params.orderTypeId}`)
  }

  if (params.orderStatusId) {
    payload.json.filter.push(`orderStatusId: ${params.orderStatusId}`)
  }

  if (params._shipmentStatusId) {
    payload.json.filter.push(`-shipmentStatusId: ${params._shipmentStatusId}`)
  }

  if (params.shipmentStatusId) {
    payload.json.filter.push(`shipmentStatusId: ${params.shipmentStatusId}`)
  }

  if (params._fulfillmentStatus) {
    payload.json.filter.push(`-fulfillmentStatus: ${params._fulfillmentStatus}`)
  }

  if (params.facilityId) {
    payload.json.filter.push(`facilityId: ${params.facilityId}`)
  }

  if (params.orderPartSeqId) {
    payload.json.filter.push(`shipGroupSeqId: ${params.orderPartSeqId}`)
  }

  if (params.orderId) {
    payload.json.filter.push(`orderId: ${params.orderId}`)
  }

  return payload
}

export { prepareOISGIRQuery }
