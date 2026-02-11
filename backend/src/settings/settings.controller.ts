import { Controller, Get, Put, Post, Delete, Param, Body } from '@nestjs/common';
import { SettingsService, SETTING_KEYS } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Test a GitHub token before saving
   */
  @Post('test-github-token')
  async testGitHubToken(@Body() body: { token: string }) {
    return this.settingsService.testGitHubToken(body.token);
  }

  /**
   * Get all settings (with sensitive values masked)
   */
  @Get()
  async getAll() {
    return this.settingsService.getAll();
  }

  /**
   * Get known setting keys
   */
  @Get('keys')
  getKeys() {
    return SETTING_KEYS;
  }

  /**
   * Update a setting
   */
  @Put(':key')
  async update(@Param('key') key: string, @Body() body: { value: string }) {
    await this.settingsService.set(key, body.value);
    return { success: true };
  }

  /**
   * Delete a setting
   */
  @Delete(':key')
  async delete(@Param('key') key: string) {
    await this.settingsService.delete(key);
    return { success: true };
  }
}
