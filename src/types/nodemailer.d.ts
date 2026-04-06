declare module "nodemailer" {
  type TransportOptions = Record<string, unknown>;

  type Transporter = {
    sendMail(options: Record<string, unknown>): Promise<unknown>;
  };

  export function createTransport(options: TransportOptions): Transporter;
}
