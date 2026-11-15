export function createStorageAdapter(provider) {
  if (!provider || !['upload','getUrl','delete'].every(method => typeof provider[method] === 'function')) {
    throw new TypeError('A media adapter must implement upload, getUrl and delete');
  }
  return Object.freeze({
    upload: (request,options) => provider.upload(request,options),
    getUrl: (reference,options) => provider.getUrl(reference,options),
    delete: (reference,options) => provider.delete(reference,options)
  });
}
