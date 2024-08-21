import store from "@/store"

const orderCategoryParameters = {
  'Open': {
    'shipmentStatusId': {
      'value': '*',
      'OP': 'NOT',
    },
    'fulfillmentStatus': {
      'value': ['Cancelled', 'Rejected'],
      'OP': 'NOT'
    },
    'orderStatusId': {
      'value': 'ORDER_APPROVED'
    },
    'orderTypeId': {
      'value': 'SALES_ORDER'
    }
  },
  'Packed': {
    'shipmentStatusId': {
      'value': 'SHIPMENT_PACKED',
    },
    'orderTypeId': {
      'value': 'SALES_ORDER'
    },
    'fulfillmentStatus': {
      'value': ['Cancelled', 'Rejected'],
      'OP': 'NOT'
    },
  },
  'Completed': {
    'orderItemStatusId': {
      'value': 'ITEM_COMPLETED'
    },
    'orderTypeId': {
      'value': 'SALES_ORDER'
    },
    'docType': {
      'value': 'ORDER'
    }
  }
} as any

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

const getOrderCategory = (order: any) => {

  if(!store.state.user.preference.showShippingOrders) {
    orderCategoryParameters["Open"]["shipmentMethodTypeId"] = { value: "STOREPICKUP" }
    orderCategoryParameters["Packed"]["shipmentMethodTypeId"] = { value: "STOREPICKUP" }
    orderCategoryParameters["Completed"]["shipmentMethodTypeId"] = { value: "STOREPICKUP" }
  }

  const orderCategoryParameterEntries = Object.entries(orderCategoryParameters)
  let result = ''
  // using find, as once any of the category is matched then return from here;
  orderCategoryParameterEntries.find((entry: any) => {
    const [category, parameters] = entry
    const paramKeys = Object.keys(parameters)
    // used every as to check against each filtering property
    
    // Added check for property value *, as we add * as value when operator NOT is defined and also for * values we want to just check for whether the property exist or not
    const isMatched = paramKeys.every((key: string) => (parameters[key].value === "*" || Object.prototype.hasOwnProperty.call(order, key)) && handleParameterMatching(order[key], parameters[key].value, parameters[key]['OP']))

    // return the value when all params matched for an order
    if (isMatched) {
      result = category;
      return result;
    }
  })
  return result;
}

export {
  getOrderCategory
}