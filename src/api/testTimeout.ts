export const testTimeout = async (request: any, response: any): Promise<void> => {
  const timeout = request.body.timeout ?? 120000;
  await new Promise(resolve => setTimeout(resolve, timeout));

  return response.status(200).json({
    msg: `${timeout} timeout ok`,
  });
};
