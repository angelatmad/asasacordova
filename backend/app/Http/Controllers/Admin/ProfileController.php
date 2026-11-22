<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Http\JsonResponse;

// Shows the signed-in admin's own profile.
// The id comes from the auth token, so a user cannot view someone else's profile here.
class ProfileController extends AdminController
{
    // Return safe profile fields at the top level and under 'user'.
    // Both shapes are sent because different screens read different keys.
    public function show(): JsonResponse
    {
        if ($error = $this->ensureTables(['users'])) {
            return $error;
        }

        // Select only the needed columns; sanitizeUser() also hides sensitive data.
        $user = User::query()
            ->select('id', 'name', 'email', 'role', 'created_at', 'updated_at')
            ->findOrFail(auth()->id());

        $profile = $this->sanitizeUser($user);

        return $this->json('Profile retrieved successfully.', array_merge($profile, ['user' => $profile]));
    }
}
