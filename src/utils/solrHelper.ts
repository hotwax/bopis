const escapeSolrQuery = (query: any) => {
  if (typeof query !== 'string') query = query ? String(query) : ''
  return query.replace(/([+\-!(){}\[\]^"~*?:\/\\|&])/g, "\\$1");
}

const prepareOrderQuery = (params: any) => {
  const viewSize = params.viewSize ? params.viewSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = params.viewIndex ? params.viewIndex : 0;

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "sort": "orderDate desc",
        "group": true,
        "group.field": params.groupBy ? params.groupBy : "orderId",
        "group.limit": 1000,
        "group.ngroups": true,
        "q.op": "AND",
        "start": viewIndex * viewSize
      },
      "query":"(*:*)",
      "filter": [`docType: ${params.docType ? escapeSolrQuery(params.docType) : 'OISGIR'}`]
    }
  } as any

  if (params.queryString) {
    payload.json.query = `(*${escapeSolrQuery(params.queryString)}*)`
    payload.json.params['qf'] = "productId productName virtualProductName orderId productSku customerId customerName customerPartyName search_customerPartyName search_orderIdentifications goodIdentifications"
    payload.json.params['defType'] = "edismax"
  }

  if (params.shipmentMethodTypeId) {
    payload.json.filter.push(`shipmentMethodTypeId: ${escapeSolrQuery(params.shipmentMethodTypeId)}`)
  }

  if (params.orderTypeId) {
    payload.json.filter.push(`orderTypeId: ${escapeSolrQuery(params.orderTypeId)}`)
  }

  if (params.orderStatusId) {
    payload.json.filter.push(`orderStatusId: ${escapeSolrQuery(params.orderStatusId)}`)
  }

  if (params['-shipmentStatusId']) {
    payload.json.filter.push(`-shipmentStatusId: ${escapeSolrQuery(params['-shipmentStatusId'])}`)
  }

  if (params.shipmentStatusId) {
    payload.json.filter.push(`shipmentStatusId: ${escapeSolrQuery(params.shipmentStatusId)}`)
  }

  if (params['-fulfillmentStatus']) {
    payload.json.filter.push(`-fulfillmentStatus: ${escapeSolrQuery(params['-fulfillmentStatus'])}`)
  }

  if (params.facilityId) {
    payload.json.filter.push(`facilityId: ${escapeSolrQuery(params.facilityId)}`)
  }

  if (params.productId) {
    payload.json.filter.push(`productId: ${escapeSolrQuery(params.productId)}`)
  }

  if (params.filters) {
    Object.keys(params.filters).forEach((key) => {
      payload.json.filter.push(`${escapeSolrQuery(key)}: ${escapeSolrQuery(params.filters[key])}`);
    });
  }
  
  if(params.orderIds){
    payload.json.filter.push(`orderId: (${params.orderIds.map((orderId: string) => escapeSolrQuery(orderId)).join(' OR ')})`)
  }

  if(params.facet) {
    payload.json['facet'] = params.facet
  }

  if (params.orderPartSeqId) {
    payload.json.filter.push(`shipGroupSeqId: ${escapeSolrQuery(params.orderPartSeqId)}`)
  }

  if (params.orderId) {
    payload.json.filter.push(`orderId: ${escapeSolrQuery(params.orderId)}`)
  }

  if (params.shipGroupSeqId) {
    payload.json.filter.push(`shipGroupSeqId: ${escapeSolrQuery(params.shipGroupSeqId)}`)
  }

  if (params['-shipGroupSeqId']) {
    payload.json.filter.push(`-shipGroupSeqId: ${escapeSolrQuery(params['-shipGroupSeqId'])}`)
  }

  if(params.orderItemStatusId) {
    payload.json.filter.push(`orderItemStatusId: ${escapeSolrQuery(params.orderItemStatusId)}`)
  }

  return payload
}

export { prepareOrderQuery }
