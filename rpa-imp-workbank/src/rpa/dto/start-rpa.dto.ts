export class StartRpaDto {
  usuario!: string;
  senha!: string;
  loja!: string;
  headless?: boolean;
  fileBase64!: string;
  fileName!: string;
  esteira!: string;
  callbackUrl!: string;
}
