const generateDocumentNumber = (prefix, count) => {
  const paddedCount = String(count).padStart(6, '0');
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${prefix}-${year}${month}-${paddedCount}`;
};

module.exports = generateDocumentNumber;

