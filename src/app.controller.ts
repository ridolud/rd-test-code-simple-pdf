import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Redirect,
  Render,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WithholdingTaxService } from './withholding-tax.service';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly withholdingTaxService: WithholdingTaxService) {}

  @Get()
  @Render('form')
  async form(@Query() query: any) {
    const result = {
      title: 'Bukti Potong Pajak | Form',
      layout: 'layouts/default',
      file: '',
    };

    if (this.withholdingTaxService.isExistPdf(query.file)) {
      Object.assign(result, { file: query.file });
    }

    return result;
  }

  @Get('file/:fileName')
  downloadPdf(@Res() res: Response, @Param('fileName') fileName: string) {
    if (!this.withholdingTaxService.isExistPdf(fileName))
      return res.redirect('/');

    this.withholdingTaxService.downloadPdf(res, fileName);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1000000 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const fileName = await this.withholdingTaxService.getPdf(file);
    return res.redirect(`/?file=${fileName}`);
  }
}
