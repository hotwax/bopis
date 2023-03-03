export default interface ProductState {
  current: any,
  cached: any,
  products: {
    list: any,
    total: number
  },
  queryString: string
}